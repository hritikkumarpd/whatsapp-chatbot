import './safety.js';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { existsSync, rmSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import qrcode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { getConfig, saveConfig } from './config.js';
import { requireAuth, socketAuth, isLoopbackIp, rateLimit } from './auth.js';
import { redactSecrets, escapeRegExp, JidLoopBreaker } from './security.js';
import {
  generateReply,
  verifyApiKey,
  simulateChat,
  clearChatHistory,
  getActiveSessionCount,
} from './gemini.js';
import { freePort, isPortOccupied } from './port.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

function getLocalIps() {
  const ips = [];
  try {
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
      for (const net of ifaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
  } catch {}
  return ips;
}

// Allowed origins for strict CORS & WebSocket security
const localIps = getLocalIps();
const allowedOriginSet = new Set([
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
localIps.forEach((ip) => {
  allowedOriginSet.add(`http://${ip}:4000`);
  allowedOriginSet.add(`http://${ip}:5173`);
});
// Always allow the server's own origin (the bundled UI is served same-origin
// from this port). Without this, running on any PORT other than 4000/5173
// makes the browser's same-origin API calls fail CORS and the UI appears dead.
allowedOriginSet.add(`http://localhost:${PORT}`);
allowedOriginSet.add(`http://127.0.0.1:${PORT}`);
localIps.forEach((ip) => allowedOriginSet.add(`http://${ip}:${PORT}`));

if (process.env.WABOT_ORIGINS) {
  process.env.WABOT_ORIGINS.split(',').forEach((o) => {
    if (o.trim()) allowedOriginSet.add(o.trim());
  });
}

if (process.env.WABOT_DOMAIN) {
  const domain = process.env.WABOT_DOMAIN.trim().replace(/^https?:\/\//, '');
  allowedOriginSet.add(`https://${domain}`);
  allowedOriginSet.add(`http://${domain}`);
}

function isOriginAllowed(origin) {
  if (!origin) return true; // Direct non-browser requests / curl / CLI
  if (process.env.WABOT_ALLOW_ANY_ORIGIN === 'true' || allowedOriginSet.has('*')) return true;
  return allowedOriginSet.has(origin);
}

const app = express();
// Trust proxy if explicitly configured (behind Nginx, Cloudflare, Traefik, or reverse proxy)
const isBehindProxy =
  process.env.TRUST_PROXY === 'true' ||
  process.env.BEHIND_PROXY === 'true';
app.set('trust proxy', isBehindProxy);

// Standard HTTP Security Headers (anti-clickjacking, anti-MIME-sniffing, etc.)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

// Strict CORS protection against Drive-By Localhost Attacks
app.use(
  cors({
    origin: (origin, cb) => {
      if (isOriginAllowed(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked for unauthorized origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Bounded JSON body parsing with clean error handling
app.use(express.json({ limit: '256kb' }));
app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ ok: false, error: 'Malformed JSON payload' });
  }
  next(err);
});

const server = http.createServer(app);
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Another instance is running — stop it first.`);
    process.exit(1);
  }
  console.error('Server error:', err.message);
});

// Socket.IO with strict handshake origin & token verification
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (isOriginAllowed(origin)) {
        cb(null, true);
      } else {
        cb(new Error('WebSocket origin rejected'), false);
      }
    },
    credentials: true,
  },
});
io.use(socketAuth);

// Server state
const startTime = Date.now();
const state = {
  status: 'disconnected', // 'disconnected' | 'connecting' | 'qr' | 'connected'
  qr: null,
  rawQr: null,
  phone: null,
  profileName: null,
  pairingCode: null,
  uptime: 0,
};

const stats = {
  received: 0,
  replied: 0,
  ignored: 0,
  rulesTriggered: 0,
  errors: 0,
};

const logs = [];
const processedMsgIds = new Set();
const loopBreaker = new JidLoopBreaker(6, 60000, 120000); // Max 6 replies/minute per JID
let sock = null;
let starting = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Record a WhatsApp message id in the dedupe cache with a hard size cap. Used for
// BOTH inbound and outbound (self-echo) ids so the Set can never grow unbounded.
function rememberMsgId(id) {
  if (!id) return;
  processedMsgIds.add(id);
  if (processedMsgIds.size > 800) {
    const first = processedMsgIds.values().next().value;
    processedMsgIds.delete(first);
  }
}

const authDir = path.join(__dirname, '..', 'auth');
const lockFilePath = path.join(authDir, '.session.lock');

function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function acquireSessionLock() {
  try {
    if (existsSync(lockFilePath)) {
      const content = readFileSync(lockFilePath, 'utf8');
      const data = JSON.parse(content);
      if (data?.pid && data.pid !== process.pid && isPidAlive(data.pid)) {
        return { acquired: false, pid: data.pid };
      }
    }
    if (!existsSync(authDir)) {
      mkdirSync(authDir, { recursive: true });
    }
    writeFileSync(lockFilePath, JSON.stringify({ pid: process.pid, time: Date.now() }), 'utf8');
    return { acquired: true };
  } catch (e) {
    return { acquired: true };
  }
}

function releaseSessionLock() {
  try {
    if (existsSync(lockFilePath)) {
      const content = readFileSync(lockFilePath, 'utf8');
      const data = JSON.parse(content);
      if (data?.pid === process.pid) {
        unlinkSync(lockFilePath);
      }
    }
  } catch {}
}

process.on('exit', releaseSessionLock);

function clearAuthDir() {
  if (existsSync(authDir)) {
    try {
      rmSync(authDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to clean auth dir:', e.message);
    }
  }
}

function pushLog(direction, sender, body, meta = {}) {
  const entry = {
    id: Date.now() + Math.random(),
    direction, // 'in' | 'out' | 'sys'
    sender,
    pushName: meta.pushName || '',
    body: redactSecrets(body || ''),
    isGroup: !!meta.isGroup,
    ruleMatched: meta.ruleMatched || null,
    time: new Date().toISOString(),
  };
  logs.push(entry);
  if (logs.length > 300) logs.shift();
  io.emit('log', entry);
  io.emit('stats', { ...stats, activeSessions: getActiveSessionCount() });
}

function setStatus(patch) {
  Object.assign(state, patch);
  state.uptime = Math.floor((Date.now() - startTime) / 1000);
  io.emit('state', { ...state, stats: { ...stats, activeSessions: getActiveSessionCount() } });
}

function wipeAllData() {
  clearAuthDir();
  clearChatHistory();
  logs.length = 0;
  processedMsgIds.clear();
  stats.received = 0;
  stats.replied = 0;
  stats.ignored = 0;
  stats.rulesTriggered = 0;
  stats.errors = 0;
  state.status = 'disconnected';
  state.qr = null;
  state.phone = null;
  state.profileName = null;
  state.pairingCode = null;
  io.emit('logs-cleared');
  io.emit('stats', { ...stats, activeSessions: 0 });
  io.emit('state', { ...state, stats: { ...stats, activeSessions: 0 } });
}

// Extract human text from any deep WhatsApp message object
function extractMessageContent(msg) {
  if (!msg.message) return { text: '', quotedText: '' };

  const m =
    msg.message.ephemeralMessage?.message ||
    msg.message.viewOnceMessage?.message ||
    msg.message.viewOnceMessageV2?.message ||
    msg.message;

  const text =
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    '';

  const ctx = m.extendedTextMessage?.contextInfo;
  let quotedText = '';
  if (ctx?.quotedMessage) {
    const qm = ctx.quotedMessage;
    quotedText =
      qm.conversation ||
      qm.extendedTextMessage?.text ||
      qm.imageMessage?.caption ||
      qm.videoMessage?.caption ||
      '';
  }

  return { text: text.trim(), quotedText: quotedText.trim() };
}

// Clean phone number from jid
function parseSender(jid, participant, isGroup) {
  const raw = isGroup ? participant : jid;
  if (!raw) return 'unknown';
  return raw.split('@')[0].split(':')[0];
}

// SECURITY: match a WhatsApp sender against a configured whitelist/blacklist
// entry. Uses exact digit equality, with a suffix match ONLY when both numbers
// are full-length (>=10 digits) to tolerate country-code presence/absence
// (e.g. 919876543210 vs 9876543210). Never a loose substring `.includes`, which
// let a short list entry match unrelated longer numbers (access-control bypass).
function phoneMatches(sender, entry) {
  const a = String(sender || '').replace(/\D/g, '');
  const b = String(entry || '').replace(/\D/g, '');
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 10 && b.length >= 10) {
    return a.endsWith(b) || b.endsWith(a);
  }
  return false;
}

// SECURITY: pushName is attacker-controlled and gets embedded into the AI prompt
// wrapper `[Group Member "..." says]`. Strip quotes, brackets, and newlines so a
// crafted display name cannot break out of the wrapper to inject fake
// roles/instructions (prompt injection). Length-capped as before.
function sanitizePushName(name) {
  return String(name || '')
    .replace(/[\r\n"'`\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

// ---- WhatsApp Core Engine ----
let reconnectAttempts = 0;
let lastDisconnectTime = 0;

async function startWA() {
  if (sock || starting) return;

  const lock = acquireSessionLock();
  if (!lock.acquired) {
    console.warn(`[Baileys] WhatsApp session is locked by another running process (PID: ${lock.pid}). Skipping start.`);
    pushLog('sys', 'system', `⚠️ Another process (PID: ${lock.pid}) is using WhatsApp credentials. Stop other instances first.`);
    setStatus({ status: 'disconnected', qr: null });
    return;
  }

  starting = true;
  setStatus({ status: 'connecting', qr: null, pairingCode: null });

  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const savedPhone = authState.creds?.me?.id?.split(':')[0] || null;
    const savedName = authState.creds?.me?.name || authState.creds?.me?.notify || null;
    if (savedPhone) state.phone = savedPhone;
    if (savedName) state.profileName = savedName;

    sock = makeWASocket({
      version,
      auth: authState,
      logger: pino({ level: 'silent' }),
      markOnlineOnConnect: false,
      browser: ['WaBot AI', 'Chrome', '124.0.0'],
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', () => {
      saveCreds();
      const n = authState.creds?.me?.name || authState.creds?.me?.notify || sock?.user?.name;
      if (n && n !== state.profileName) {
        setStatus({ profileName: n });
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          setStatus({ status: 'qr', qr: qrDataUrl, rawQr: qr });
        } catch (e) {
          console.error('QR generation error:', e);
        }
      }

      if (connection === 'open') {
        reconnectAttempts = 0;
        const myNum = sock.user?.id?.split(':')[0] || authState.creds?.me?.id?.split(':')[0] || null;
        const myName = sock.user?.name || authState.creds?.me?.name || authState.creds?.me?.notify || 'WaBot Operator';
        setStatus({ status: 'connected', qr: null, rawQr: null, phone: myNum, profileName: myName, pairingCode: null });
        pushLog('sys', 'system', `✅ WhatsApp successfully connected! ${myNum ? `Number: +${myNum}` : ''} ${myName ? `(${myName})` : ''}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        sock = null;

        if (statusCode === DisconnectReason.loggedOut) {
          wipeAllData();
          releaseSessionLock();
          pushLog('sys', 'system', '⚠️ WhatsApp session logged out from phone. Click Connect to scan new QR.');
        } else if (statusCode === DisconnectReason.connectionReplaced) {
          releaseSessionLock();
          setStatus({ status: 'disconnected', qr: null });
          pushLog('sys', 'system', '⚠️ WhatsApp connection replaced by another device or active session. Auto-reconnect paused to prevent loop.');
        } else if (statusCode === DisconnectReason.restartRequired) {
          setStatus({ status: 'connecting', qr: null });
          startWA();
        } else if (statusCode !== DisconnectReason.loggedOut) {
          const now = Date.now();
          if (now - lastDisconnectTime < 15000) {
            reconnectAttempts++;
          } else {
            reconnectAttempts = 1;
          }
          lastDisconnectTime = now;

          const delay = reconnectAttempts > 3 ? Math.min(30000, 5000 * (reconnectAttempts - 2)) : 4000;
          if (reconnectAttempts > 3) {
            pushLog('sys', 'system', `⚠️ Frequent disconnects detected (${reconnectAttempts}). Backing off next reconnect for ${Math.round(delay / 1000)}s.`);
          }
          setStatus({ status: 'connecting', qr: null });
          setTimeout(startWA, delay);
        } else {
          setStatus({ status: 'disconnected', qr: null, phone: null, profileName: null, pairingCode: null });
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || !msg.key) continue; // malformed upsert guard
        const jid = msg.key.remoteJid;
        if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) continue;

        const myNum = sock?.user?.id?.split(':')[0] || authState?.creds?.me?.id?.split(':')[0] || state.phone;
        const isSelf = !!(jid && myNum && (jid.split('@')[0] === myNum || jid.startsWith(myNum)));

        // If fromMe and NOT a self-chat test, skip (user typing to someone else)
        if (msg.key.fromMe && !isSelf) continue;

        const msgId = msg.key.id;
        if (msgId && processedMsgIds.has(msgId)) continue;
        if (msgId) rememberMsgId(msgId);

        try {
          await handleMessage(msg);
        } catch (e) {
          stats.errors++;
          if (e.message === 'NO_GEMINI_KEY') {
            pushLog('sys', 'system', '⚠️ Gemini API Key not configured! Set your key in Bot Config.');
          } else {
            pushLog('sys', 'system', `⚠️ Error: ${redactSecrets(e.message)}`);
          }
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize Baileys:', err);
    setStatus({ status: 'disconnected', qr: null });
  } finally {
    starting = false;
  }
}

async function stopWA() {
  if (sock) {
    try {
      await sock.logout();
    } catch (e) {
      console.warn('Socket logout error (ignoring):', e.message);
    }
    try {
      sock.end(undefined);
    } catch {}
    sock = null;
  }
  releaseSessionLock();
  wipeAllData();
}

async function handleMessage(msg) {
  const jid = msg.key.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return;

  const isGroup = jid.endsWith('@g.us');
  const { text, quotedText } = extractMessageContent(msg);
  if (!text) return;

  const sender = parseSender(jid, msg.key.participant, isGroup);
  const pushName = msg.pushName || '';
  const cfg = await getConfig();

  stats.received++;

  // Group filter check
  if (isGroup) {
    if (!cfg.replyInGroups) {
      stats.ignored++;
      pushLog('sys', 'system', `ℹ️ Group message from ${pushName || sender} ignored (Reply in Groups is disabled in Settings).`);
      return;
    }
    if (cfg.groupOnlyWhenMentioned) {
      const jidDigits = (v) =>
        v ? String(v).split('@')[0].split(':')[0].replace(/\D/g, '') : '';

      const botDigits = [
        jidDigits(sock?.user?.id),
        jidDigits(sock?.user?.lid),
        jidDigits(state.phone),
      ].filter(Boolean);

      const ctx =
        msg.message.extendedTextMessage?.contextInfo ||
        msg.message.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
        msg.message.viewOnceMessageV2?.message?.extendedTextMessage?.contextInfo ||
        msg.message.imageMessage?.contextInfo ||
        msg.message.videoMessage?.contextInfo ||
        null;

      const mentioned = ctx?.mentionedJid || [];
      const isMentioned = mentioned.some((mJid) => botDigits.includes(jidDigits(mJid)));
      const isReplyToMe =
        ctx?.participant && botDigits.includes(jidDigits(ctx.participant));

      const lowerText = text.toLowerCase().trim();
      const hasBotPrefix = /^(bot\b|[!/.#]bot\b|@bot\b|ai\b|[!/.#]ai\b)/i.test(lowerText);

      // Safe word-boundary match for profile name to prevent substring false triggers
      let hasNameMention = false;
      if (state.profileName && state.profileName.trim().length >= 2) {
        const escaped = escapeRegExp(state.profileName.trim());
        const nameRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        hasNameMention = nameRegex.test(text);
      }

      const isTriggered = isMentioned || isReplyToMe || hasBotPrefix || hasNameMention;

      if (!isTriggered) {
        stats.ignored++;
        pushLog('sys', 'system', `ℹ️ Group message from ${pushName || sender} ignored (Bot not mentioned or tagged in group).`);
        return;
      }
    }
  }

  // Blacklist / Whitelist filter check
  if (cfg.filterMode === 'blacklist' && Array.isArray(cfg.blacklist) && cfg.blacklist.length > 0) {
    const isBlocked = cfg.blacklist.some((num) => phoneMatches(sender, num));
    if (isBlocked) {
      stats.ignored++;
      pushLog('in', sender, text, { isGroup, pushName });
      pushLog('sys', 'system', `Ignored ${sender} (in Blacklist)`);
      return;
    }
  }

  if (cfg.filterMode === 'whitelist' && Array.isArray(cfg.whitelist) && cfg.whitelist.length > 0) {
    const isAllowed = cfg.whitelist.some((num) => phoneMatches(sender, num));
    if (!isAllowed) {
      stats.ignored++;
      pushLog('in', sender, text, { isGroup, pushName });
      return;
    }
  }

  pushLog('in', sender, text, { isGroup, pushName });

  if (!cfg.autoReply) {
    stats.ignored++;
    pushLog('sys', 'system', `ℹ️ Message from ${sender} received, but Auto-Reply is turned OFF.`);
    return;
  }

  // Loop breaker guard: stop rapid automated ping-pong / bot loops
  if (!loopBreaker.canReply(jid)) {
    stats.ignored++;
    pushLog('sys', 'system', `⚠️ Rate limit: Automated reply paused for ${sender} (too many messages in short period).`);
    return;
  }

  // Mark message as read if enabled
  if (cfg.markRead && sock?.readMessages) {
    try {
      await sock.readMessages([msg.key]);
    } catch {}
  }

  // 1. Check custom quick-rules before invoking Gemini
  if (Array.isArray(cfg.customRules)) {
    const matchedRule = cfg.customRules.find((rule) => {
      if (!rule.enabled || !rule.keyword || !rule.reply) return false;
      const kw = rule.keyword.toLowerCase().trim();
      const txt = text.toLowerCase().trim();
      if (rule.matchType === 'exact') return txt === kw;
      if (rule.matchType === 'starts') return txt.startsWith(kw);
      return txt.includes(kw); // default 'contains'
    });

    if (matchedRule) {
      stats.rulesTriggered++;
      stats.replied++;

      loopBreaker.recordReply(jid);
      await simulateTyping(jid, matchedRule.reply, cfg.typingDelay);
      try {
        const sent = await sock.sendMessage(jid, { text: matchedRule.reply }, { quoted: msg });
        if (sent?.key?.id) rememberMsgId(sent.key.id);
      } catch {}

      pushLog('out', sender, matchedRule.reply, {
        isGroup,
        pushName,
        ruleMatched: matchedRule.keyword,
      });
      return;
    }
  }

  // 2. Clear command detection
  if (text.toLowerCase() === '/reset' || text.toLowerCase() === '!reset') {
    clearChatHistory(jid);
    const resetMsg = 'Chat context has been reset. We can start a fresh conversation.';
    loopBreaker.recordReply(jid);
    try {
      const sent = await sock.sendMessage(jid, { text: resetMsg }, { quoted: msg });
      if (sent?.key?.id) rememberMsgId(sent.key.id);
    } catch {}
    pushLog('out', sender, resetMsg, { isGroup, pushName });
    return;
  }

  // 3. Gemini AI auto-reply
  try {
    await sock.sendPresenceUpdate('composing', jid);
  } catch {}

  const userTextForAI = isGroup && pushName
    ? `[Group Member "${sanitizePushName(pushName)}" says]: ${text}`
    : text;

  const reply = await generateReply({
    jid,
    apiKey: cfg.geminiKey,
    model: cfg.model,
    systemPrompt: cfg.systemPrompt,
    userText: userTextForAI,
    quotedText,
    temperature: cfg.temperature,
    maxHistoryTurns: cfg.maxHistoryTurns,
    sessionResetMinutes: cfg.sessionResetMinutes,
  });

  loopBreaker.recordReply(jid);
  await simulateTyping(jid, reply, cfg.typingDelay);

  try {
    const sent = await sock.sendMessage(jid, { text: reply }, { quoted: msg });
    if (sent?.key?.id) rememberMsgId(sent.key.id);
    stats.replied++;
    pushLog('out', sender, reply, { isGroup, pushName });
  } catch (sendErr) {
    stats.errors++;
    console.error('Failed to dispatch WhatsApp reply:', sendErr?.message || sendErr);
    pushLog('sys', 'system', `❌ Failed to dispatch reply to ${sender}: ${redactSecrets(sendErr.message)}`);
  }
}

async function simulateTyping(jid, text, mode = 'realistic') {
  if (mode === 'off' || mode === 'instant') return;

  try {
    await sock?.sendPresenceUpdate('composing', jid);
  } catch {}

  let waitMs = 1200;
  if (mode === 'fast') {
    waitMs = 800;
  } else if (mode === 'realistic') {
    waitMs = Math.min(3500, Math.max(1200, (text?.length || 20) * 25));
  }

  await sleep(waitMs);
  try {
    await sock?.sendPresenceUpdate('paused', jid);
  } catch {}
}

// ---- REST API Endpoints ----

// Public health probe
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: state.status, uptime: Math.floor((Date.now() - startTime) / 1000) });
});

// Loopback-only token resolution endpoint for local frontend auto-discovery
app.get('/api/auth/token', async (req, res) => {
  // Use the raw TCP peer address, never req.ip / X-Forwarded-For, so a spoofed
  // forwarding header can never make a remote client look like loopback.
  const clientIp = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  const origin = req.headers.origin || req.headers.referer || '';
  const isLocal = isLoopbackIp(clientIp);
  const isLocalOrigin =
    !origin || origin.includes('localhost') || origin.includes('127.0.0.1');

  if (isLocal && isLocalOrigin) {
    const cfg = await getConfig();
    return res.json({ ok: true, token: cfg.authToken });
  }

  return res.status(403).json({
    ok: false,
    error: 'Forbidden: Automatic token resolution only permitted on local loopback interface.',
  });
});

// Rate limiters for privileged endpoints
const generalLimiter = rateLimit({ windowMs: 60000, max: 120, message: 'Too many requests, slow down.' });
const aiLimiter = rateLimit({ windowMs: 60000, max: 15, message: 'AI request limit reached. Please wait a minute.' });
const keyLimiter = rateLimit({ windowMs: 60000, max: 10, message: 'Key verification limit reached.' });
const pairLimiter = rateLimit({ windowMs: 300000, max: 5, message: 'Pairing requests rate-limited. Try again later.' });

// Protected API routes require valid token
app.use('/api', generalLimiter, requireAuth);

app.get('/api/state', (_req, res) => {
  state.uptime = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    ...state,
    stats: { ...stats, activeSessions: getActiveSessionCount() },
    logs,
  });
});

app.get('/api/config', async (_req, res) => {
  const cfg = await getConfig();
  res.json({
    ...cfg,
    geminiKeySet: !!cfg.geminiKey,
    geminiKey: cfg.geminiKey ? `${cfg.geminiKey.slice(0, 6)}••••••••` : '',
    authToken: `${cfg.authToken.slice(0, 4)}••••••••`,
  });
});

app.post('/api/config', async (req, res) => {
  try {
    const patch = { ...req.body };
    if (patch.geminiKey === '' || (patch.geminiKey && patch.geminiKey.includes('••••'))) {
      delete patch.geminiKey;
    }
    const cfg = await saveConfig(patch);
    res.json({ ok: true, geminiKeySet: !!cfg.geminiKey });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message || 'Invalid configuration' });
  }
});

app.post('/api/connect', async (_req, res) => {
  startWA();
  res.json({ ok: true });
});

app.post('/api/disconnect', async (_req, res) => {
  await stopWA();
  res.json({ ok: true });
});

app.post('/api/pairing-code', pairLimiter, async (req, res) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ ok: false, error: 'Phone number string is required' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 16) {
    return res.status(400).json({ ok: false, error: 'Invalid phone number format' });
  }

  try {
    if (!sock) {
      await startWA();
      await sleep(1500);
    }
    if (sock?.requestPairingCode) {
      const code = await sock.requestPairingCode(cleanPhone);
      state.pairingCode = code;
      setStatus({ pairingCode: code, status: 'qr' });
      return res.json({ ok: true, code });
    }
    res.status(500).json({ ok: false, error: 'Pairing code not available on active socket' });
  } catch (err) {
    res.status(500).json({ ok: false, error: redactSecrets(err.message) });
  }
});

app.post('/api/test-key', keyLimiter, async (req, res) => {
  const cfg = await getConfig();
  const keyToTest = req.body.key?.trim() || cfg.geminiKey;
  const modelToTest = req.body.model || cfg.model || 'gemini-3.5-flash-lite';
  const result = await verifyApiKey(keyToTest, modelToTest);
  res.json(result);
});

app.post('/api/test-ai', aiLimiter, async (req, res) => {
  const { message, systemPrompt, model, history } = req.body;
  const cfg = await getConfig();
  const apiKey = cfg.geminiKey;
  if (!apiKey) {
    return res.status(400).json({ error: 'Gemini API key is not configured' });
  }
  if (typeof message !== 'string' || !message.trim() || message.length > 4000) {
    return res.status(400).json({ error: 'Message must be between 1 and 4000 characters' });
  }

  try {
    const reply = await simulateChat({
      apiKey,
      model: model || cfg.model || 'gemini-3.5-flash-lite',
      systemPrompt: systemPrompt || cfg.systemPrompt,
      message,
      history: Array.isArray(history) ? history.slice(-40) : [],
      temperature: cfg.temperature || 0.7,
    });
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: redactSecrets(err.message) });
  }
});

app.post('/api/clear-history', (req, res) => {
  const { jid } = req.body;
  clearChatHistory(jid);
  res.json({ ok: true, message: jid ? `Cleared memory for ${jid}` : 'Cleared all conversation histories' });
});

app.post('/api/clear-logs', (_req, res) => {
  logs.length = 0;
  io.emit('logs-cleared');
  res.json({ ok: true });
});

// Serve production build if present.
// Vite generates content-hashed assets, so cache immutable assets aggressively,
// but never cache index.html. This prevents browsers/proxies from pairing an
// old HTML entrypoint with a newer/deleted JS bundle after a deployment.
const dist = path.join(__dirname, '..', '..', 'web', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, filePath) => {
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filePath.includes(path.sep + 'assets' + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  app.get('*', (req, res, next) => {
    // Never return index.html for a missing JS/CSS/image asset. Doing so turns
    // a missing bundle into a confusing browser runtime error.
    if (req.path.startsWith('/assets/')) {
      return res.status(404).json({ ok: false, error: 'Frontend asset not found. Rebuild the dashboard.' });
    }
    res.sendFile(path.join(dist, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

io.on('connection', (socket) => {
  state.uptime = Math.floor((Date.now() - startTime) / 1000);
  socket.emit('state', { ...state, stats: { ...stats, activeSessions: getActiveSessionCount() } });
  logs.slice(-80).forEach((l) => socket.emit('log', l));
});

// Graceful process termination
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down WaBot cleanly...`);
  releaseSessionLock();
  if (sock) {
    try {
      sock.end(undefined);
    } catch {}
  }
  io.close();
  server.close(() => {
    console.log('✅ WaBot server stopped cleanly.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Automatic Port Liberation: Overwrite port if already occupied
const portInUse = await isPortOccupied(PORT);
if (portInUse) {
  console.log(`⚠️  [Auto-Port] Port ${PORT} is occupied by another process. Overwriting & clearing port...`);
  freePort(PORT);
  await new Promise((r) => setTimeout(r, 600));
}

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️  [Auto-Port] Port ${PORT} busy (EADDRINUSE). Force-terminating occupant and retrying...`);
    freePort(PORT);
    setTimeout(() => {
      try {
        server.close();
      } catch {}
      server.listen(PORT, '0.0.0.0');
    }, 1000);
  } else {
    console.error('❌ Server startup error:', err);
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  const cfg = await getConfig();
  console.log(`\n=================================================`);
  console.log(`🚀 WaBot Server is active & listening!`);
  console.log(`📱 Local:              http://localhost:${PORT}`);
  localIps.forEach((ip) => {
    console.log(`🌐 Network / Wi-Fi:   http://${ip}:${PORT}`);
  });
  console.log(`🔑 Web Access Token:  ${cfg.authToken}`);
  console.log(`🛡️  Security:          CORS hardened, Loopback auth & Rate-limiting ACTIVE`);
  console.log(`⚡ Port Guard:        Auto-Port Overwrite Protection ENABLED`);
  console.log(`=================================================\n`);

  const credsFile = path.join(__dirname, '..', 'auth', 'creds.json');
  if (existsSync(credsFile)) {
    try {
      const saved = JSON.parse(readFileSync(credsFile, 'utf8'));
      if (saved.me?.name) state.profileName = saved.me.name;
      if (saved.me?.id) state.phone = saved.me.id.split(':')[0];
    } catch {}
    console.log('🔁 Resuming saved WhatsApp session from auth storage...');
    startWA();
  }
});

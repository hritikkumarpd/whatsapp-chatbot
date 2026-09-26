import './safety.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { redactSecrets, escapeRegExp, JidLoopBreaker, validateConfigPatch } from './security.js';
import {
  generateReply,
  verifyApiKey,
  simulateChat,
  clearChatHistory,
  getActiveSessionCount,
} from './gemini.js';

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
app.set('trust proxy', isBehindProxy ? 'loopback' : false);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

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
app.use(cors((req, callback) => {
  const origin = req.get('Origin');
  if (!origin) return callback(null, { origin: false });

  const forwardedProto = String(req.get('X-Forwarded-Proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const sameOrigin = origin === protocol + '://' + req.get('host');

  if (sameOrigin || isOriginAllowed(origin)) {
    return callback(null, {
      origin,
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Token', 'X-WaBot-Token'],
      maxAge: 600,
    });
  }
  return callback(new Error('CORS origin not allowed'));
}));

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
    console.error('❌ Port ' + PORT + ' is already in use. Stop the existing instance or choose another PORT.');
  } else {
    console.error('❌ Server startup error:', redactSecrets(err?.message || err));
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', async () => {
  await getConfig();
  console.log('\n=================================================');
  console.log('🚀 WaBot Server is active & listening!');
  console.log('📱 Local:              http://localhost:' + PORT);
  localIps.forEach((ip) => {
    console.log('🌐 Network / Wi-Fi:   http://' + ip + ':' + PORT);
  });
  console.log('🛡️  Security:          Authentication, CORS, WebSocket auth & rate-limiting ACTIVE');
  console.log('=================================================\n');

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

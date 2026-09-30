#!/usr/bin/env node
// ========================================================
// WaBot Pro — Universal Cross-Platform CLI & Terminal Manager
// Runs on: Windows, macOS, Ubuntu, Linux, Raspberry Pi, Termux
// ========================================================

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { spawn, exec, spawnSync } from 'child_process';
import { getConfig, saveConfig } from './server/src/config.js';
import { verifyApiKey } from './server/src/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const PID_FILE = path.join(ROOT_DIR, 'wabot.pid');
const LOG_FILE = path.join(ROOT_DIR, 'wabot.log');
const CONFIG_FILE = path.join(SERVER_DIR, 'config.json');
const BASE_URL = 'http://127.0.0.1:4000';

// ANSI terminal colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  brightGreen: '\x1b[1;32m',
  blue: '\x1b[34m',
  brightBlue: '\x1b[1;34m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[1;36m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[1;33m',
  red: '\x1b[31m',
  brightRed: '\x1b[1;31m',
  magenta: '\x1b[35m',
};

// Check if a PID is actively alive on any OS
function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

// Get saved PID
function getSavedPid() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
      if (pid && isPidAlive(pid)) return Number(pid);
    }
  } catch { }
  return null;
}

// Acquire local token from loopback API
async function getToken() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/token`);
    const data = await res.json();
    return data?.token || null;
  } catch {
    return null;
  }
}

// Get secret auth token from loopback API or config.json
async function getAuthToken() {
  let token = await getToken();
  if (!token) {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        token = cfg.authToken;
      }
    } catch { }
  }
  return token;
}

// Check server health probe
async function getHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
    return await res.json();
  } catch {
    return null;
  }
}

// Check detailed server state
async function getState() {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/state`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500),
    });
    return await res.json();
  } catch {
    return null;
  }
}

// Get non-internal network IPv4 addresses (Wi-Fi, Ethernet, Hotspot)
function getNetworkIps() {
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
  } catch { }
  return ips;
}

// Open dashboard in default browser across platforms
function openBrowser(url) {
  const platform = process.platform;
  if (platform === 'win32') {
    exec(`start "" "${url}"`);
  } else if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else if (fs.existsSync('/data/data/com.termux')) {
    exec(`termux-open-url "${url}" 2>/dev/null || xdg-open "${url}" 2>/dev/null`);
  } else {
    exec(`xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null`);
  }
}

// Start background server process
async function startServer() {
  const existingPid = getSavedPid();
  if (existingPid) {
    const health = await getHealth();
    if (health) {
      console.log(`${c.brightYellow}⚠️  WaBot is ALREADY RUNNING & HEALTHY with PID: ${existingPid}${c.reset}`);
      console.log(`📱 Local UI:     ${c.brightCyan}${BASE_URL}${c.reset}`);
      return;
    }
  }

  // Always verify/repair the production dashboard before starting the server.
  // This prevents a stale Vite index.html from referencing missing JS chunks.
  console.log(c.cyan + '🔎 Verifying dashboard build...' + c.reset);
  const webCheck = spawnSync(process.execPath, [
    path.join(ROOT_DIR, 'scripts', 'ensure-web-build.mjs'),
    '--repair',
  ], { cwd: ROOT_DIR, stdio: 'inherit' });
  if (webCheck.status !== 0) {
    console.log(c.brightRed + '❌ Dashboard build verification failed. Server was not started.' + c.reset);
    return;
  }

  console.log(`${c.brightBlue}🚀 Launching WaBot Server in background...${c.reset}`);

  // Acquire Android wakelock if on Termux
  if (fs.existsSync('/data/data/com.termux')) {
    try {
      exec('termux-wake-lock');
      console.log(`${c.brightGreen}🔒 Android CPU WakeLock acquired.${c.reset}`);
    } catch { }
  }

  const outLog = fs.openSync(LOG_FILE, 'a');
  const errLog = fs.openSync(LOG_FILE, 'a');

  const child = spawn(process.execPath, [path.join(SERVER_DIR, 'src', 'index.js')], {
    cwd: SERVER_DIR,
    detached: true,
    stdio: ['ignore', outLog, errLog],
  });

  child.unref();
  fs.writeFileSync(PID_FILE, String(child.pid), 'utf8');

  // Wait briefly to verify start
  await new Promise((r) => setTimeout(r, 1500));

  if (isPidAlive(child.pid)) {
    console.log(`${c.brightGreen}✅ WaBot server started successfully!${c.reset}`);
    console.log(`   PID:          ${c.brightCyan}${child.pid}${c.reset}`);
    console.log(`   Dashboard:    ${c.brightCyan}${BASE_URL}${c.reset}`);
    const ips = getNetworkIps();
    if (ips.length > 0) {
      console.log(`   Network/LAN:  ${c.brightCyan}http://${ips[0]}:4000${c.reset}`);
    }
    console.log(`   Log File:     ${c.dim}${LOG_FILE}${c.reset}`);
  } else {
    console.log(`${c.brightRed}❌ Server failed to start! Recent logs:${c.reset}`);
    try {
      const logs = fs.readFileSync(LOG_FILE, 'utf8').split('\n').slice(-15).join('\n');
      console.log(logs);
    } catch { }
  }
}

// Stop background server process
async function stopServer() {
  const pid = getSavedPid();
  let stopped = false;

  if (pid) {
    console.log(`${c.yellow}Stopping WaBot daemon (PID: ${pid})...${c.reset}`);
    try {
      if (process.platform === 'win32') {
        exec(`taskkill /PID ${pid} /T /F`);
      } else {
        process.kill(pid, 'SIGTERM');
      }
      stopped = true;
    } catch (e) {
      console.log(`${c.dim}Kill error: ${e.message}${c.reset}`);
    }
    try {
      fs.unlinkSync(PID_FILE);
    } catch { }
  }

  // Release Termux wakelock if applicable
  if (fs.existsSync('/data/data/com.termux')) {
    try {
      exec('termux-wake-unlock');
      console.log(`${c.dim}🔓 Android WakeLock released.${c.reset}`);
    } catch { }
  }

  // Double check port 4000 health
  await new Promise((r) => setTimeout(r, 1000));
  const health = await getHealth();
  if (!health) {
    console.log(`${c.brightGreen}✅ WaBot server has been stopped cleanly.${c.reset}`);
  } else {
    console.log(`${c.brightYellow}⚠️  Another instance appears to still be responding on port 4000.${c.reset}`);
  }
}

// Display Live Status Card
async function showStatus() {
  const pid = getSavedPid();
  const health = await getHealth();
  const state = await getState();
  const ips = getNetworkIps();

  console.log(`\n${c.brightBlue}====================================================${c.reset}`);
  console.log(`${c.brightGreen}${c.bold}            📊 WaBot Service Status                 ${c.reset}`);
  console.log(`${c.brightBlue}====================================================${c.reset}`);

  console.log(` Platform    : ${c.bold}${os.type()} ${os.arch()} (Node ${process.version})${c.reset}`);
  console.log(` System RAM  : ${c.dim}${Math.round(os.freemem() / 1024 / 1024)}MB free / ${Math.round(os.totalmem() / 1024 / 1024)}MB total${c.reset}`);

  if (health) {
    const token = await getAuthToken();
    console.log(` Process     : ${c.brightGreen}● RUNNING${c.reset} (PID: ${pid || 'active on :4000'})`);
    console.log(` Uptime      : ${Math.floor(health.uptime / 60)}m ${health.uptime % 60}s`);
    console.log(` WhatsApp    : ${state?.status === 'connected' ? `${c.brightGreen}CONNECTED ✅ (+${state.phone} - ${state.profileName})${c.reset}` : `${c.brightYellow}${state?.status || health.status}${c.reset}`}`);
    console.log(` Dashboard   : ${c.brightCyan}${BASE_URL}${c.reset}`);
    if (token) {
      console.log(` Auth Token  : ${c.brightYellow}${token}${c.reset}`);
    }
    if (ips.length > 0) {
      console.log(` Network IP  : ${c.brightCyan}http://${ips[0]}:4000${c.reset}`);
      if (token) {
        console.log(` PC Link     : ${c.brightCyan}http://${ips[0]}:4000/?token=${token}${c.reset}`);
      }
    }
    if (state?.stats) {
      console.log(` Messages In : ${state.stats.received || 0} | Replied: ${state.stats.replied || 0} | Errors: ${state.stats.errors || 0}`);
    }
  } else {
    console.log(` Process     : ${c.brightRed}○ STOPPED${c.reset}`);
    console.log(` Port 4000   : Inactive`);
  }
  console.log(`${c.brightBlue}====================================================${c.reset}\n`);
}

// Display Access Token and Remote Access Links
async function showTokenInfo() {
  const token = await getAuthToken();
  const ips = getNetworkIps();

  console.log(`\n${c.brightBlue}====================================================${c.reset}`);
  console.log(`${c.brightGreen}${c.bold}           🔑 Web Dashboard Access Token            ${c.reset}`);
  console.log(`${c.brightBlue}====================================================${c.reset}`);
  if (token) {
    console.log(` Secret Token   : ${c.brightYellow}${token}${c.reset}`);
    console.log(`\n ${c.bold}To access from your PC browser (without entering token manually):${c.reset}`);
    if (ips.length > 0) {
      console.log(` 👉 ${c.brightCyan}http://${ips[0]}:4000/?token=${token}${c.reset}\n`);
    } else {
      console.log(` 👉 ${c.brightCyan}http://<your-phone-ip>:4000/?token=${token}${c.reset}\n`);
    }
    console.log(` ${c.dim}Or open http://<phone-ip>:4000 and paste the secret token into the prompt.${c.reset}`);
  } else {
    console.log(`${c.brightRed}❌ Token not found. Start the bot first with 'wabot start'.${c.reset}`);
  }
  console.log(`${c.brightBlue}====================================================${c.reset}\n`);
}

// Request WhatsApp Pairing Code via Terminal
async function requestPairingCode(phoneArg) {
  const health = await getHealth();
  if (!health) {
    console.log(`${c.brightRed}❌ WaBot server is not running! Start it first with: wabot start${c.reset}`);
    return;
  }

  let phone = phoneArg;
  if (!phone) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    phone = await new Promise((resolve) => {
      rl.question(`${c.brightYellow}Enter phone number with country code (e.g. 918544668673): ${c.reset}`, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
  }

  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    console.log(`${c.brightRed}❌ Invalid phone number. Must be at least 10 digits.${c.reset}`);
    return;
  }

  console.log(`${c.yellow}⏳ Requesting 8-digit Pairing Code for +${cleanPhone}...${c.reset}`);

  const token = await getToken();
  try {
    const res = await fetch(`${BASE_URL}/api/pairing-code`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: cleanPhone }),
    });
    const data = await res.json();

    if (data.ok && data.code) {
      console.log(`\n${c.brightGreen}====================================================${c.reset}`);
      console.log(`${c.bold}          YOUR WHATSAPP PAIRING CODE IS:            ${c.reset}`);
      console.log(`                 ${c.brightCyan}${c.bold}[ ${data.code} ]${c.reset}                     `);
      console.log(`${c.brightGreen}====================================================${c.reset}`);
      console.log(`Instructions:`);
      console.log(`1. Open WhatsApp on your phone`);
      console.log(`2. Go to Settings > ${c.bold}Linked Devices${c.reset}`);
      console.log(`3. Tap ${c.bold}Link a Device${c.reset} > ${c.brightYellow}Link with phone number instead${c.reset}`);
      console.log(`4. Enter the code shown above: ${c.brightCyan}${data.code}${c.reset}`);
      console.log(`${c.brightGreen}====================================================${c.reset}\n`);
    } else {
      console.log(`${c.brightRed}❌ Failed: ${data.error || 'Could not generate pairing code'}${c.reset}`);
    }
  } catch (err) {
    console.log(`${c.brightRed}❌ Connection error: ${err.message}${c.reset}`);
  }
}

// Display Live QR Code in Terminal
async function showTerminalQr() {
  const state = await getState();
  if (!state) {
    console.log(`${c.brightRed}❌ WaBot server is not running on port 4000.${c.reset}`);
    return;
  }

  if (state.status === 'connected') {
    console.log(`${c.brightGreen}✅ WhatsApp is ALREADY CONNECTED to +${state.phone} (${state.profileName}).${c.reset}`);
    return;
  }

  // Import qrcode library from server node_modules
  let qrcode;
  try {
    const qm = await import(path.join(SERVER_DIR, 'node_modules', 'qrcode', 'lib', 'index.js'));
    qrcode = qm.default || qm;
  } catch {
    console.log(`${c.brightYellow}ℹ️  Open the web dashboard to scan QR: ${c.brightCyan}${BASE_URL}${c.reset}`);
    return;
  }

  console.log(`${c.yellow}Checking QR Code availability...${c.reset}`);
  // If not currently in QR state, trigger connect
  if (state.status !== 'qr') {
    const token = await getToken();
    await fetch(`${BASE_URL}/api/connect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => { });
  }

  console.log(`${c.dim}Waiting for QR handshake...${c.reset}`);
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const s = await getState();
    if (s?.qr) {
      console.log(`\n${c.brightGreen}Scan this QR Code with your WhatsApp Camera:${c.reset}\n`);
      // Render terminal string QR
      const qrPayload = s.rawQr || s.qr;
      qrcode.toString(qrPayload, { type: 'terminal', small: true }, (err, str) => {
        if (!err && str) {
          console.log(str);
        } else {
          console.log(`Open in browser: ${BASE_URL}`);
        }
      });
      return;
    }
    if (s?.status === 'connected') {
      console.log(`${c.brightGreen}✅ WhatsApp connected!${c.reset}`);
      return;
    }
  }
  console.log(`${c.brightYellow}QR code taking longer to generate. View in browser: ${c.brightCyan}${BASE_URL}${c.reset}`);
}

// Test Gemini AI Reply from Terminal
async function testAi(messageArg) {
  let msg = messageArg;
  if (!msg) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    msg = await new Promise((resolve) => {
      rl.question(`${c.brightYellow}Enter test message to AI: ${c.reset}`, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
  }
  if (!msg) return;

  const token = await getToken();
  if (!token) {
    console.log(`${c.brightRed}❌ Server not reachable on port 4000.${c.reset}`);
    return;
  }

  console.log(`${c.dim}Sending to Gemini AI...${c.reset}`);
  try {
    const res = await fetch(`${BASE_URL}/api/test-ai`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: msg }),
    });
    const data = await res.json();
    if (data.reply) {
      console.log(`\n${c.brightGreen}${c.bold}AI Reply:${c.reset} ${data.reply}\n`);
    } else {
      console.log(`${c.brightRed}❌ Error: ${data.error || 'Failed to get reply'}${c.reset}`);
    }
  } catch (err) {
    console.log(`${c.brightRed}❌ Error: ${err.message}${c.reset}`);
  }
}

// Configure or update Gemini AI API key from terminal
async function configureGeminiKey(keyArg) {
  const cfg = await getConfig();
  let key = keyArg;

  if (!key) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const masked = cfg.geminiKey
      ? `${cfg.geminiKey.slice(0, 6)}...${cfg.geminiKey.slice(-4)}`
      : '(none)';
    console.log(`\n${c.brightBlue}====================================================${c.reset}`);
    console.log(`${c.brightGreen}${c.bold}         🔑 Configure Gemini AI API Key             ${c.reset}`);
    console.log(`${c.brightBlue}====================================================${c.reset}`);
    console.log(`Current Key : ${c.yellow}${masked}${c.reset}`);
    console.log(`Get free key: ${c.brightCyan}https://aistudio.google.com/app/apikey${c.reset}\n`);

    key = await new Promise((resolve) => {
      rl.question(`${c.bold}Enter new Gemini API Key (or press Enter to keep current): ${c.reset}`, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });
  }

  if (!key) {
    if (!cfg.geminiKey) {
      console.log(`${c.brightYellow}No API key entered.${c.reset}`);
    } else {
      console.log(`${c.dim}Keeping existing key.${c.reset}`);
    }
    return;
  }

  console.log(`\n${c.yellow}⏳ Validating API key with Google AI Studio...${c.reset}`);
  const result = await verifyApiKey(key, cfg.model || 'gemini-3.5-flash-lite');

  if (result.ok) {
    console.log(`${c.brightGreen}✅ Google Gemini API key is VALID!${c.reset}`);
  } else {
    console.log(`${c.brightYellow}⚠️  Notice: Google verification reported: ${result.message}${c.reset}`);
    console.log(`${c.dim}Saving key to configuration as requested...${c.reset}`);
  }

  // Save to config file
  await saveConfig({ geminiKey: key });

  // If server is actively running, update server state live via API
  const token = await getToken();
  if (token) {
    try {
      await fetch(`${BASE_URL}/api/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ geminiKey: key }),
      });
      console.log(`${c.brightGreen}🔄 Live server configuration updated!${c.reset}`);
    } catch {}
  }

  console.log(`${c.brightGreen}✅ Gemini API Key saved successfully to configuration.${c.reset}\n`);
}

// View live activity logs
function viewLogs() {
  console.log(`${c.brightCyan}Streaming live logs from ${LOG_FILE} (Ctrl+C to exit)...${c.reset}\n`);
  if (!fs.existsSync(LOG_FILE)) {
    console.log(`${c.dim}No logs recorded yet.${c.reset}`);
    return;
  }
  const tail = spawn(process.platform === 'win32' ? 'powershell' : 'tail', [
    process.platform === 'win32' ? '-Command' : '-f',
    process.platform === 'win32' ? `Get-Content "${LOG_FILE}" -Wait -Tail 30` : '-n 30',
    ...(process.platform !== 'win32' ? [LOG_FILE] : []),
  ], { stdio: 'inherit' });

  process.on('SIGINT', () => {
    tail.kill();
    process.exit(0);
  });
}

// Interactive Terminal Menu
async function runInteractiveMenu() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const promptChoice = (question) =>
    new Promise((resolve) => rl.question(question, resolve));

  while (true) {
    console.clear();
    const pid = getSavedPid();
    const health = await getHealth();
    const state = await getState();
    const ips = getNetworkIps();

    console.log(`${c.brightBlue}====================================================${c.reset}`);
    console.log(`${c.brightGreen}${c.bold}           🤖 WaBot Pro — Universal CLI             ${c.reset}`);
    console.log(`${c.brightBlue}====================================================${c.reset}`);
    console.log(` Status     : ${health ? `${c.brightGreen}● RUNNING (PID: ${pid || 'active'})${c.reset}` : `${c.brightRed}○ STOPPED${c.reset}`}`);
    if (health) {
      const token = await getAuthToken();
      console.log(` WhatsApp   : ${state?.status === 'connected' ? `${c.brightGreen}CONNECTED ✅ (+${state.phone})${c.reset}` : `${c.brightYellow}${state?.status || 'connecting'}${c.reset}`}`);
      console.log(` Local UI   : ${c.brightCyan}${BASE_URL}${c.reset}`);
      if (token) {
        console.log(` Auth Token : ${c.brightYellow}${token}${c.reset}`);
      }
      if (ips.length > 0) {
        console.log(` Network IP : ${c.brightCyan}http://${ips[0]}:4000${c.reset}`);
        if (token) {
          console.log(` PC Link    : ${c.brightCyan}http://${ips[0]}:4000/?token=${token}${c.reset}`);
        }
      }
    }
    console.log(`${c.brightBlue}----------------------------------------------------${c.reset}`);
    console.log(` ${c.bold}[1]${c.reset} 🚀 Start Bot (Background Daemon)`);
    console.log(` ${c.bold}[2]${c.reset} 🛑 Stop Bot`);
    console.log(` ${c.bold}[3]${c.reset} 🔄 Restart Bot`);
    console.log(` ${c.bold}[4]${c.reset} 📊 Full System & Service Status`);
    console.log(` ${c.bold}[5]${c.reset} 📱 Get WhatsApp Pairing Code (Terminal Linking)`);
    console.log(` ${c.bold}[6]${c.reset} 📷 Show Terminal QR Code`);
    console.log(` ${c.bold}[7]${c.reset} 🔑 Configure Gemini AI API Key`);
    console.log(` ${c.bold}[8]${c.reset} 🧠 Test Gemini AI Reply`);
    console.log(` ${c.bold}[9]${c.reset} 📋 Stream Live Activity Logs`);
    console.log(` ${c.bold}[10]${c.reset} 🌐 Open Dashboard in Default Browser`);
    console.log(` ${c.bold}[11]${c.reset} 🔐 Show Access Token for PC Login (or 't')`);
    console.log(` ${c.bold}[0]${c.reset} 🚪 Exit CLI`);
    console.log(`${c.brightBlue}====================================================${c.reset}`);

    const choice = (await promptChoice(`${c.bold}Choose an option [0-11, k, or t]: ${c.reset}`)).trim();

    if (choice === '1') {
      await startServer();
      await promptChoice('\nPress Enter to continue...');
    } else if (choice === '2') {
      await stopServer();
      await promptChoice('\nPress Enter to continue...');
    } else if (choice === '3') {
      await stopServer();
      await startServer();
      await promptChoice('\nPress Enter to continue...');
    } else if (choice === '4') {
      await showStatus();
      await promptChoice('\nPress Enter to return...');
    } else if (choice === '5') {
      await requestPairingCode();
      await promptChoice('\nPress Enter to return...');
    } else if (choice === '6') {
      await showTerminalQr();
      await promptChoice('\nPress Enter to return...');
    } else if (choice === '7' || choice.toLowerCase() === 'k') {
      await configureGeminiKey();
      await promptChoice('\nPress Enter to return...');
    } else if (choice === '8') {
      await testAi();
      await promptChoice('\nPress Enter to return...');
    } else if (choice === '9') {
      rl.close();
      viewLogs();
      return;
    } else if (choice === '10') {
      openBrowser(BASE_URL);
      console.log(`${c.green}Opening ${BASE_URL}...${c.reset}`);
      await new Promise((r) => setTimeout(r, 1000));
    } else if (choice === '11' || choice.toLowerCase() === 't') {
      await showTokenInfo();
      await promptChoice('\nPress Enter to return...');
    } else if (choice === '0') {
      console.log(`\n${c.brightGreen}Keep your bot active! Goodbye.${c.reset}\n`);
      rl.close();
      process.exit(0);
    }
  }
}

// Direct CLI argument handling
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

switch (command) {
  case 'start':
    await startServer();
    break;
  case 'stop':
    await stopServer();
    break;
  case 'restart':
    await stopServer();
    await startServer();
    break;
  case 'status':
    await showStatus();
    break;
  case 'pair':
    await requestPairingCode(args[1]);
    break;
  case 'qr':
    await showTerminalQr();
    break;
  case 'key':
  case 'set-key':
  case 'api-key':
    await configureGeminiKey(args[1]);
    break;
  case 'token':
  case 'auth':
  case 'get-token':
    await showTokenInfo();
    break;
  case 'logs':
    viewLogs();
    break;
  case 'open':
    openBrowser(BASE_URL);
    break;
  case 'test-ai':
    await testAi(args.slice(1).join(' '));
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log(`
${c.brightGreen}${c.bold}WaBot Pro Universal CLI${c.reset}
Usage:
  wabot              Open interactive terminal menu
  wabot start        Start bot daemon in background
  wabot stop         Stop running bot daemon
  wabot restart      Restart bot daemon
  wabot status       Check live connection & resource status
  wabot key [key]    Set or update Gemini AI API key
  wabot pair [phone] Get WhatsApp 8-digit pairing code
  wabot qr           Show terminal ASCII QR code
  wabot logs         Stream live logs
  wabot open         Open dashboard in browser
  wabot test-ai      Test Gemini AI reply
`);
    break;
  default:
    await runInteractiveMenu();
    break;
}

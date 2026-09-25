import { readFile, writeFile, rename, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { validateConfigPatch } from './security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '..', 'config.json');

export const DEFAULTS = {
  authToken: '',
  geminiKey: '',
  systemPrompt:
    'You are a smart, natural WhatsApp assistant replying on my behalf. Keep replies concise, conversational and human-like. Automatically detect and match the language, tone, and slang used by the sender. Do not sound like a robotic AI.',
  model: 'gemini-flash-latest',
  temperature: 0.7,
  autoReply: true,
  replyInGroups: true,
  groupOnlyWhenMentioned: false,
  markRead: true,
  typingDelay: 'realistic', // 'instant' | 'fast' | 'realistic' | 'off'
  filterMode: 'all', // 'all' | 'blacklist' | 'whitelist'
  blacklist: [], // phone numbers to ignore
  whitelist: [], // phone numbers to only reply to
  customRules: [
    {
      id: 'rule-demo-1',
      keyword: 'urgent',
      matchType: 'contains',
      reply: 'If this is truly urgent, please call me directly — I am a little busy at the moment.',
      enabled: false,
    },
  ],
  sessionResetMinutes: 60,
  maxHistoryTurns: 14,
};

let cache = null;

/**
 * Resilient atomic file write using temporary file renaming.
 * Prevents zero-byte corruption if power/process is cut during write.
 */
async function atomicWrite(filePath, data) {
  const tmp = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const jsonStr = JSON.stringify(data, null, 2);
  await writeFile(tmp, jsonStr, 'utf8');
  try {
    await rename(tmp, filePath);
  } catch {
    await writeFile(filePath, jsonStr, 'utf8');
    try {
      await unlink(tmp);
    } catch {}
  }
}

export async function getConfig() {
  if (cache) return cache;
  let data = {};
  if (existsSync(FILE)) {
    try {
      data = JSON.parse(await readFile(FILE, 'utf8'));
    } catch {
      data = {};
    }
  }

  cache = { ...DEFAULTS, ...data };

  // Environment variable overrides take precedence
  if (process.env.GEMINI_API_KEY && !cache.geminiKey) {
    cache.geminiKey = process.env.GEMINI_API_KEY.trim();
  }
  if (process.env.ADMIN_API_KEY || process.env.WABOT_TOKEN) {
    cache.authToken = (process.env.ADMIN_API_KEY || process.env.WABOT_TOKEN).trim();
  }

  // Ensure persistent high-entropy authToken exists
  if (!cache.authToken) {
    cache.authToken = crypto.randomBytes(24).toString('hex');
    await atomicWrite(FILE, cache);
  }

  return cache;
}

export async function saveConfig(patch) {
  const cleanPatch = validateConfigPatch(patch);
  const cfg = await getConfig();
  cache = { ...cfg, ...cleanPatch };
  await atomicWrite(FILE, cache);
  return cache;
}

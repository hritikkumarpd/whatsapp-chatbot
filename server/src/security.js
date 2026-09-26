


import crypto from 'crypto';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const ALLOWED_MODELS = new Set([
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash',
]);

const ALLOWED_TYPING_DELAYS = new Set(['realistic', 'fast', 'instant', 'off']);
const ALLOWED_FILTER_MODES = new Set(['all', 'blacklist', 'whitelist']);
const ALLOWED_MATCH_TYPES = new Set(['contains', 'exact', 'starts']);

/**
 * Redact sensitive API keys, tokens, and authorization credentials from error strings and logs.
 */
export function redactSecrets(str) {
  if (typeof str !== 'string') {
    str = String(str?.message || str || '');
  }
  return str
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED_GEMINI_KEY]')
    .replace(/AIza[0-9A-Za-z-_]{30,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/AQ\.[0-9A-Za-z-_]{20,}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED_TOKEN]')
    .replace(/(x-api-token:\s*)[^\s]+/gi, '$1[REDACTED_TOKEN]');
}

/**
 * Constant-time safe string comparison to prevent timing side-channel attacks.
 * Uses SHA-256 digest to ensure identical buffer lengths before timingSafeEqual.
 */
export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) {
    return false;
  }
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Escape string for safe inclusion in regular expressions.
 */
export function escapeRegExp(string) {
  return typeof string === 'string' ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

/**
 * Validate and sanitize configuration patches to prevent prototype pollution,
 * type confusion, out-of-bounds parameters, and corrupted settings.
 */
export function validateConfigPatch(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Config patch must be a non-null object');
  }

  // Prototype pollution protection
  for (const key of Object.keys(patch)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Security violation: Forbidden property '${key}'`);
    }
  }

  const clean = {};

  if ('geminiKey' in patch) {
    if (typeof patch.geminiKey !== 'string') {
      throw new Error('geminiKey must be a string');
    }
    const trimmed = patch.geminiKey.trim();
    if (trimmed.length > 250) {
      throw new Error('geminiKey exceeds maximum length of 250 characters');
    }
    if (/[\r\n]/.test(trimmed)) {
      throw new Error('geminiKey contains invalid newline characters');
    }
    clean.geminiKey = trimmed;
  }

  if ('systemPrompt' in patch) {
    if (typeof patch.systemPrompt !== 'string') {
      throw new Error('systemPrompt must be a string');
    }
    const trimmed = patch.systemPrompt.trim();
    if (trimmed.length > 10000) {
      throw new Error('systemPrompt exceeds maximum length of 10,000 characters');
    }
    clean.systemPrompt = trimmed;
  }

  if ('model' in patch) {
    if (typeof patch.model !== 'string' || !ALLOWED_MODELS.has(patch.model.trim())) {
      throw new Error(`Invalid model. Must be one of: ${Array.from(ALLOWED_MODELS).join(', ')}`);
    }
    clean.model = patch.model.trim();
  }

  if ('temperature' in patch) {
    const val = Number(patch.temperature);
    if (Number.isNaN(val) || val < 0 || val > 1.0) {
      throw new Error('temperature must be a number between 0.0 and 1.0');
    }
    clean.temperature = Math.round(val * 100) / 100;
  }

  if ('autoReply' in patch) {
    if (typeof patch.autoReply !== 'boolean') {
      throw new Error('autoReply must be a boolean');
    }
    clean.autoReply = patch.autoReply;
  }

  if ('replyInGroups' in patch) {
    if (typeof patch.replyInGroups !== 'boolean') {
      throw new Error('replyInGroups must be a boolean');
    }
    clean.replyInGroups = patch.replyInGroups;
  }

  if ('groupOnlyWhenMentioned' in patch) {
    if (typeof patch.groupOnlyWhenMentioned !== 'boolean') {
      throw new Error('groupOnlyWhenMentioned must be a boolean');
    }
    clean.groupOnlyWhenMentioned = patch.groupOnlyWhenMentioned;
  }

  if ('markRead' in patch) {
    if (typeof patch.markRead !== 'boolean') {
      throw new Error('markRead must be a boolean');
    }
    clean.markRead = patch.markRead;
  }

  if ('typingDelay' in patch) {
    if (typeof patch.typingDelay !== 'string' || !ALLOWED_TYPING_DELAYS.has(patch.typingDelay)) {
      throw new Error(`typingDelay must be one of: ${Array.from(ALLOWED_TYPING_DELAYS).join(', ')}`);
    }
    clean.typingDelay = patch.typingDelay;
  }

  if ('filterMode' in patch) {
    if (typeof patch.filterMode !== 'string' || !ALLOWED_FILTER_MODES.has(patch.filterMode)) {
      throw new Error(`filterMode must be one of: ${Array.from(ALLOWED_FILTER_MODES).join(', ')}`);
    }
    clean.filterMode = patch.filterMode;
  }

  if ('blacklist' in patch) {
    if (!Array.isArray(patch.blacklist)) {
      throw new Error('blacklist must be an array of phone numbers');
    }
    if (patch.blacklist.length > 500) {
      throw new Error('blacklist cannot exceed 500 entries');
    }
    clean.blacklist = patch.blacklist
      .filter((n) => typeof n === 'string')
      .map((n) => n.replace(/\D/g, ''))
      .filter((n) => n.length >= 7 && n.length <= 16);
  }

  if ('whitelist' in patch) {
    if (!Array.isArray(patch.whitelist)) {
      throw new Error('whitelist must be an array of phone numbers');
    }
    if (patch.whitelist.length > 500) {
      throw new Error('whitelist cannot exceed 500 entries');
    }
    clean.whitelist = patch.whitelist
      .filter((n) => typeof n === 'string')
      .map((n) => n.replace(/\D/g, ''))
      .filter((n) => n.length >= 7 && n.length <= 16);
  }

  if ('sessionResetMinutes' in patch) {
    const val = parseInt(patch.sessionResetMinutes, 10);
    if (Number.isNaN(val) || val < 0 || val > 10080) {
      throw new Error('sessionResetMinutes must be an integer between 0 and 10080 (max 7 days)');
    }
    clean.sessionResetMinutes = val;
  }

  if ('maxHistoryTurns' in patch) {
    const val = parseInt(patch.maxHistoryTurns, 10);
    if (Number.isNaN(val) || val < 2 || val > 50) {
      throw new Error('maxHistoryTurns must be an integer between 2 and 50');
    }
    clean.maxHistoryTurns = val;
  }

  if ('customRules' in patch) {
    if (!Array.isArray(patch.customRules)) {
      throw new Error('customRules must be an array');
    }
    if (patch.customRules.length > 100) {
      throw new Error('customRules cannot exceed 100 rules');
    }
    clean.customRules = patch.customRules.map((rule, idx) => {
      if (!rule || typeof rule !== 'object') {
        throw new Error(`customRule at index ${idx} is invalid`);
      }
      const id = String(rule.id || `rule-${Date.now()}-${idx}`).slice(0, 50);
      const keyword = String(rule.keyword || '').trim().slice(0, 100);
      const reply = String(rule.reply || '').trim().slice(0, 3000);
      const matchType = ALLOWED_MATCH_TYPES.has(rule.matchType) ? rule.matchType : 'contains';
      const enabled = Boolean(rule.enabled);
      if (!keyword && enabled) {
        throw new Error(`customRule at index ${idx} must have a non-empty keyword`);
      }
      return { id, keyword, reply, matchType, enabled };
    });
  }

  return clean;
}

/**
 * Sliding-window in-memory rate limiter middleware.
 */
export function createRateLimiter(opts = {}) {
  const windowMs = opts.windowMs || 60000;
  const maxRequests = opts.maxRequests || opts.max || 60;
  const message = opts.message || 'Too many requests';
  const store = new Map();

  // Periodic cleanup every 60 seconds to prevent memory leak
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now - record.resetTime > windowMs) {
        store.delete(key);
      }
    }
  }, 60000);

  if (interval.unref) interval.unref();

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
    const now = Date.now();
    let record = store.get(ip);

    if (!record || now - record.resetTime > windowMs) {
      record = { count: 1, resetTime: now };
      store.set(ip, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.resetTime + windowMs) / 1000));

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        ok: false,
        error: message,
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Outbound automated reply loop breaker.
 * Limits how many automated responses can be sent to a single JID within a sliding time window.
 */
export class JidLoopBreaker {
  constructor(maxPerWindow = 6, windowMs = 60000, cooldownMs = 120000) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
    this.cooldownMs = cooldownMs;
    this.records = new Map(); // jid -> { timestamps: [], cooldownUntil: 0 }

    // Periodic sweep every 2 minutes
    const interval = setInterval(() => this.cleanup(), 120000);
    if (interval.unref) interval.unref();
  }

  canReply(jid) {
    if (!jid) return false;
    const now = Date.now();
    let rec = this.records.get(jid);
    if (!rec) {
      rec = { timestamps: [], cooldownUntil: 0 };
      this.records.set(jid, rec);
    }

    if (rec.cooldownUntil > now) {
      return false; // Still in cooldown
    }

    // Filter out timestamps outside window
    rec.timestamps = rec.timestamps.filter((t) => now - t < this.windowMs);

    if (rec.timestamps.length >= this.maxPerWindow) {
      rec.cooldownUntil = now + this.cooldownMs;
      return false; // Tripped!
    }

    return true;
  }

  recordReply(jid) {
    if (!jid) return;
    const now = Date.now();
    let rec = this.records.get(jid);
    if (!rec) {
      rec = { timestamps: [], cooldownUntil: 0 };
      this.records.set(jid, rec);
    }
    rec.timestamps.push(now);
  }

  cleanup() {
    const now = Date.now();
    for (const [jid, rec] of this.records.entries()) {
      if (rec.cooldownUntil <= now && (!rec.timestamps.length || now - rec.timestamps[rec.timestamps.length - 1] > this.windowMs)) {
        this.records.delete(jid);
      }
    }
  }
}

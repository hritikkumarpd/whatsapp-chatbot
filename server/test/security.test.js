import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateConfigPatch,
  safeCompare,
  redactSecrets,
  escapeRegExp,
  createRateLimiter,
  JidLoopBreaker,
} from '../src/security.js';

// ---- validateConfigPatch (prototype pollution, type confusion, bounds) ----

test('validateConfigPatch rejects prototype-pollution keys', () => {
  assert.throws(() => validateConfigPatch(JSON.parse('{"__proto__":{"polluted":true}}')), /Forbidden/);
  assert.throws(() => validateConfigPatch(JSON.parse('{"constructor":{"x":1}}')), /Forbidden/);
  assert.equal({}.polluted, undefined);
});

test('validateConfigPatch rejects non-object input', () => {
  assert.throws(() => validateConfigPatch(null));
  assert.throws(() => validateConfigPatch([1, 2]));
  assert.throws(() => validateConfigPatch('str'));
});

test('validateConfigPatch enforces numeric bounds', () => {
  assert.throws(() => validateConfigPatch({ temperature: 99 }));
  assert.throws(() => validateConfigPatch({ temperature: -1 }));
  assert.throws(() => validateConfigPatch({ maxHistoryTurns: 100000 }));
  assert.throws(() => validateConfigPatch({ sessionResetMinutes: -5 }));
  assert.equal(validateConfigPatch({ temperature: 0.5 }).temperature, 0.5);
  assert.equal(validateConfigPatch({ maxHistoryTurns: 14 }).maxHistoryTurns, 14);
});

test('validateConfigPatch enforces enums and types (type confusion)', () => {
  assert.throws(() => validateConfigPatch({ filterMode: 'evil' }));
  assert.throws(() => validateConfigPatch({ autoReply: 'yes' }));
  assert.throws(() => validateConfigPatch({ blacklist: 'not-array' }));
  assert.equal(validateConfigPatch({ filterMode: 'whitelist' }).filterMode, 'whitelist');
});

test('validateConfigPatch sanitizes phone lists to digits', () => {
  const out = validateConfigPatch({ whitelist: ['+1 (234) 567-8900', 'abc', 12345] });
  assert.deepEqual(out.whitelist, ['12345678900']);
});

test('validateConfigPatch bounds oversized inputs (DoS)', () => {
  assert.throws(() => validateConfigPatch({ systemPrompt: 'a'.repeat(20000) }));
  assert.throws(() => validateConfigPatch({ customRules: new Array(500).fill({ keyword: 'k' }) }));
});

test('validateConfigPatch strips unknown keys', () => {
  assert.deepEqual(validateConfigPatch({ evilField: 1, isAdmin: true }), {});
});

test('validateConfigPatch enforces the valid Gemini model allow-list', () => {
  assert.throws(() => validateConfigPatch({ model: 'gemini-invalid-retired' })); // retired/invalid id
  assert.throws(() => validateConfigPatch({ model: 'gpt-4' }));
  assert.equal(validateConfigPatch({ model: 'gemini-flash-latest' }).model, 'gemini-flash-latest');
  assert.equal(validateConfigPatch({ model: 'gemini-2.5-flash' }).model, 'gemini-2.5-flash');
  assert.equal(validateConfigPatch({ model: 'gemini-3.8-flash' }).model, 'gemini-3.8-flash');
  assert.equal(validateConfigPatch({ model: 'gemini-3.7-flash' }).model, 'gemini-3.7-flash');
  assert.equal(validateConfigPatch({ model: 'gemini-3.1-flash-lite' }).model, 'gemini-3.1-flash-lite');
});

test('validateConfigPatch rejects newlines in gemini key (log/JSON injection)', () => {
  assert.throws(() => validateConfigPatch({ geminiKey: 'abc\ndef' }));
});

// ---- safeCompare (constant-time, no crash on bad input) ----

test('safeCompare matches equal, rejects unequal and bad input', () => {
  assert.equal(safeCompare('secret', 'secret'), true);
  assert.equal(safeCompare('secret', 'wrong'), false);
  assert.equal(safeCompare('a', 'ab'), false);
  assert.equal(safeCompare('', ''), false);
  assert.equal(safeCompare(null, 'x'), false);
  assert.equal(safeCompare(undefined, undefined), false);
});

// ---- redactSecrets (no key leakage in errors/logs) ----

test('redactSecrets scrubs API keys and tokens', () => {
  assert.match(redactSecrets('key=AIzaSyABC1234567890abcdefghijklmnopqrstuv'), /REDACTED/);
  assert.match(redactSecrets('AQ.Ab8RN6KbxpEKWDJEoVv3Gx8C8o5suFGz2fySoR5'), /REDACTED/);
  assert.match(redactSecrets('Authorization: Bearer abc.def-123'), /REDACTED_TOKEN/);
  assert.doesNotMatch(redactSecrets('normal error message'), /REDACTED/);
});

// ---- escapeRegExp (ReDoS / regex injection) ----

test('escapeRegExp neutralizes regex metacharacters', () => {
  assert.equal(escapeRegExp('a.*b(c)'), 'a\\.\\*b\\(c\\)');
  assert.equal(escapeRegExp(123), '');
});

// ---- createRateLimiter ----

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

test('createRateLimiter blocks past the max', () => {
  const mw = createRateLimiter({ windowMs: 60000, max: 3 });
  const req = { ip: '9.9.9.9' };
  let allowed = 0, blocked = 0;
  for (let i = 0; i < 6; i++) {
    const res = mockRes();
    mw(req, res, () => allowed++);
    if (res.statusCode === 429) blocked++;
  }
  assert.equal(allowed, 3);
  assert.equal(blocked, 3);
});

// ---- JidLoopBreaker (automated reply-loop protection) ----

test('JidLoopBreaker trips after max replies and enters cooldown', () => {
  const lb = new JidLoopBreaker(3, 60000, 120000);
  const jid = '123@s.whatsapp.net';
  let ok = 0;
  for (let i = 0; i < 5; i++) {
    if (lb.canReply(jid)) { ok++; lb.recordReply(jid); }
  }
  assert.equal(ok, 3);
  assert.equal(lb.canReply(jid), false);
});

test('JidLoopBreaker isolates separate JIDs', () => {
  const lb = new JidLoopBreaker(2, 60000, 120000);
  lb.recordReply('a@x'); lb.recordReply('a@x');
  assert.equal(lb.canReply('a@x'), false);
  assert.equal(lb.canReply('b@x'), true);
});

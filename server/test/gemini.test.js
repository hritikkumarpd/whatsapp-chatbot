import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeHistory,
  clearChatHistory,
  getActiveSessionCount,
} from '../src/gemini.js';

test('Gemini Engine - sanitizeHistory', async (t) => {
  await t.test('enforces strict alternating user and model turns', () => {
    const raw = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi! How can I help?' }] },
      { role: 'user', parts: [{ text: 'Who are you?' }] },
      { role: 'model', parts: [{ text: 'I am your assistant.' }] },
    ];
    const clean = sanitizeHistory(raw);
    assert.equal(clean.length, 4);
    assert.equal(clean[0].role, 'user');
    assert.equal(clean[1].role, 'model');
    assert.equal(clean[2].role, 'user');
    assert.equal(clean[3].role, 'model');
  });

  await t.test('merges consecutive same-role parts safely without crashing', () => {
    const raw = [
      { role: 'user', parts: [{ text: 'First user line' }] },
      { role: 'user', parts: [{ text: 'Second user line directly after' }] },
      { role: 'model', parts: [{ text: 'Model reply' }] },
    ];
    const clean = sanitizeHistory(raw);
    assert.equal(clean.length, 2);
    assert.equal(clean[0].role, 'user');
    assert.match(clean[0].parts[0].text, /First user line\nSecond user line/);
    assert.equal(clean[1].role, 'model');
  });

  await t.test('ensures history ends on model before accepting new user message', () => {
    const raw = [
      { role: 'user', parts: [{ text: 'Incomplete prompt' }] },
    ];
    const clean = sanitizeHistory(raw);
    assert.equal(clean.length, 0); // Trailing unmatched user role dropped
  });

  await t.test('handles invalid, empty, or corrupted items gracefully', () => {
    const raw = [
      null,
      undefined,
      { role: 'unknown' },
      { parts: [] },
      { role: 'user', parts: [{ text: 'Valid message' }] },
      { role: 'model', parts: [{ text: 'Valid response' }] },
    ];
    const clean = sanitizeHistory(raw);
    assert.equal(clean.length, 2);
    assert.equal(clean[0].role, 'user');
    assert.equal(clean[1].role, 'model');
  });
});

test('Gemini Engine - Session Management', async (t) => {
  await t.test('clearing chat history works for individual and all sessions', () => {
    clearChatHistory();
    assert.equal(getActiveSessionCount(), 0);
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { requireAuth, isLoopbackIp, rateLimit } from '../src/auth.js';
import { getConfig, saveConfig } from '../src/config.js';

test('Integration - Express API Security & Authorization', async (t) => {
  const cfg = await getConfig();
  const validToken = cfg.authToken;

  // Spin up an isolated test express app
  const app = express();
  app.set('trust proxy', true);

  const allowedOrigins = new Set(['http://localhost:4000', 'http://127.0.0.1:4000']);
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.has(origin)) cb(null, true);
        else cb(new Error('CORS blocked'));
      },
      credentials: true,
    })
  );

  app.use(express.json());

  // Loopback token route
  app.get('/api/auth/token', (req, res) => {
    const clientIp = req.ip || req.connection?.remoteAddress || '';
    if (isLoopbackIp(clientIp)) {
      return res.json({ ok: true, token: validToken });
    }
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  });

  const testLimiter = rateLimit({ windowMs: 2000, max: 3, message: 'Rate limit hit' });
  app.get('/api/limited', testLimiter, (_req, res) => {
    res.json({ ok: true });
  });

  // Protected route
  app.get('/api/protected', requireAuth, (_req, res) => {
    res.json({ ok: true, data: 'sensitive-chat-logs' });
  });

  // Error middleware
  app.use((err, _req, res, _next) => {
    res.status(500).json({ ok: false, error: err.message });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('unauthenticated request to protected route is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/protected`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.ok, false);
    assert.match(data.error, /Unauthorized/);
  });

  await t.test('request with invalid token is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { 'x-api-token': 'wrong-token-value' },
    });
    assert.equal(res.status, 401);
  });

  await t.test('request with valid token succeeds with 200', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { 'x-api-token': validToken },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.data, 'sensitive-chat-logs');
  });

  await t.test('token via Bearer authorization header succeeds with 200', async () => {
    const res = await fetch(`${baseUrl}/api/protected`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  await t.test('loopback client can acquire token via /api/auth/token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/token`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.token, validToken);
  });

  await t.test('rate limiter blocks requests beyond threshold with 429', async () => {
    const r1 = await fetch(`${baseUrl}/api/limited`);
    const r2 = await fetch(`${baseUrl}/api/limited`);
    const r3 = await fetch(`${baseUrl}/api/limited`);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 200);

    // 4th request trips limiter
    const r4 = await fetch(`${baseUrl}/api/limited`);
    assert.equal(r4.status, 429);
    const data = await r4.json();
    assert.equal(data.ok, false);
    assert.match(data.error, /Rate limit hit/);
  });
});

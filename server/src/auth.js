import { getConfig } from './config.js';
import { safeCompare, createRateLimiter } from './security.js';

export const AUTH_ENABLED = true;

/**
 * Determine if an IP address is a local loopback address.
 */
export function isLoopbackIp(ip) {
  if (!ip) return false;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('127.') ||
    ip === 'localhost'
  );
}

function presentedToken(req) {
  const header = req.headers['x-api-token'] || req.headers['x-wabot-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();

  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }

  return '';
}

/**
 * Express middleware requiring the secret auth token.
 */
export async function requireAuth(req, res, next) {
  try {
    const cfg = await getConfig();
    const expected = cfg.authToken;

    const token = presentedToken(req);
    if (token && safeCompare(token, expected)) {
      return next();
    }

    return res.status(401).json({
      ok: false,
      error: 'Unauthorized: Valid Access Token required in Authorization header or x-api-token',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Authentication internal error' });
  }
}

/**
 * Socket.IO handshake authentication gate.
 */
const socketAttempts = new Map();

function socketHandshakeRateLimited(ip) {
  const key = ip || 'unknown';
  const now = Date.now();
  const rec = socketAttempts.get(key);
  if (!rec || now - rec.startedAt >= 60000) {
    socketAttempts.set(key, { startedAt: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > 30;
}

export async function socketAuth(socket, next) {
  try {
    const clientIp = socket.handshake.address || socket.conn?.remoteAddress || '';
    if (socketHandshakeRateLimited(clientIp)) {
      return next(new Error('Too many connection attempts'));
    }
    const cfg = await getConfig();
    const expected = cfg.authToken;

    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers['x-api-token'] ||
      socket.handshake.headers['x-wabot-token'] ||
      '';

    if (token && safeCompare(token, expected)) {
      return next();
    }

    // Allow automatic handshake for loopback clients connecting from local browser
    const origin = socket.handshake.headers.origin || '';
    const isLocalOrigin =
      !origin ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');

    if (isLoopbackIp(clientIp) && isLocalOrigin) {
      return next();
    }

    return next(new Error('Unauthorized: Valid token required for real-time WebSocket connection'));
  } catch (err) {
    return next(new Error('Socket authentication error'));
  }
}

/**
 * Rate limiter middleware helper
 */
export function rateLimit(options) {
  return createRateLimiter(options);
}

import { io } from 'socket.io-client';

// Local server. In dev, Vite runs on :5173 and server on :4000.
// In production (server serves the build), same origin.
const BASE = import.meta.env.DEV ? 'http://localhost:4000' : '';

let cachedToken = '';
try {
  cachedToken = localStorage.getItem('wabot_token') || '';
} catch {}

// Automatically capture ?token= from URL if present (useful for remote VPS / Domain setup)
if (typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken && urlToken.trim()) {
      cachedToken = urlToken.trim();
      localStorage.setItem('wabot_token', cachedToken);
      // Clean query parameter from URL to prevent token leakage in history or screenshots
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  } catch {}
}

const authListeners = new Set();
function notifyAuthRequired() {
  authListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

// Auto-discover token on local loopback connection
export async function resolveToken() {
  if (cachedToken) return cachedToken;
  try {
    const res = await fetch(`${BASE}/api/auth/token`);
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        cachedToken = data.token;
        localStorage.setItem('wabot_token', cachedToken);
        if (socket?.auth) {
          socket.auth.token = cachedToken;
        }
        return cachedToken;
      }
    }
  } catch {}
  return cachedToken;
}

resolveToken();

export const socket = io(BASE || undefined, {
  transports: ['websocket', 'polling'],
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  auth: {
    token: cachedToken,
  },
});

socket.on('connect_error', async (err) => {
  if (err?.message && err.message.includes('Unauthorized')) {
    const freshToken = await resolveToken();
    if (freshToken) {
      socket.auth.token = freshToken;
      socket.connect();
    } else {
      notifyAuthRequired();
    }
  }
});

async function req(method, url, body) {
  let token = cachedToken || (await resolveToken());
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['x-api-token'] = token;
  }

  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const freshToken = await resolveToken();
    if (freshToken && freshToken !== token) {
      headers['x-api-token'] = freshToken;
      const retryRes = await fetch(BASE + url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (retryRes.ok) return retryRes.json();
    }
    notifyAuthRequired();
  }

  if (!res.ok) {
    let errMessage = 'Request failed';
    try {
      const data = await res.json();
      errMessage = data.error || data.message || errMessage;
    } catch {}
    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  setToken: (t) => {
    cachedToken = t || '';
    if (t) {
      localStorage.setItem('wabot_token', t);
    } else {
      localStorage.removeItem('wabot_token');
    }
    if (socket?.auth) {
      socket.auth.token = cachedToken;
    }
    socket.disconnect().connect();
  },
  getToken: () => cachedToken,
  resolveToken,
  onAuthRequired: (fn) => {
    authListeners.add(fn);
    return () => authListeners.delete(fn);
  },
  getState: () => req('GET', '/api/state'),
  getConfig: () => req('GET', '/api/config'),
  saveConfig: (patch) => req('POST', '/api/config', patch),
  connect: () => req('POST', '/api/connect'),
  disconnect: () => req('POST', '/api/disconnect'),
  requestPairingCode: (phone) => req('POST', '/api/pairing-code', { phone }),
  testApiKey: (data) => req('POST', '/api/test-key', data),
  testAi: (data) => req('POST', '/api/test-ai', data),
  clearHistory: (jid) => req('POST', '/api/clear-history', { jid }),
  clearLogs: () => req('POST', '/api/clear-logs'),
};

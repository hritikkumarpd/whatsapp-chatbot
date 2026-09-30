#!/usr/bin/env node
/**
 * WaBot production doctor.
 * Run while the server is running:
 *   node scripts/doctor.mjs
 *
 * It never prints authToken/Gemini keys.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.PORT || 4000;
const base = process.env.WABOT_DOCTOR_URL || 'http://127.0.0.1:' + port;
let failed = 0;

function ok(name, detail = '') {
  console.log('✓ ' + name + (detail ? ' — ' + detail : ''));
}
function fail(name, detail = '') {
  failed++;
  console.error('✗ ' + name + (detail ? ' — ' + detail : ''));
}

async function checkFetch(name, url, options = {}, expectedStatus = 200) {
  try {
    const res = await fetch(url, { ...options, redirect: 'manual' });
    if (res.status === expectedStatus) {
      ok(name, 'HTTP ' + res.status);
      return res;
    }
    fail(name, 'expected HTTP ' + expectedStatus + ', got ' + res.status);
  } catch (err) {
    fail(name, err.message);
  }
  return null;
}

console.log('\nWaBot Pro Production Doctor\n');

const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok('Node.js', process.version);
else fail('Node.js', 'Node 20+ required; found ' + process.version);

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'server/package.json'), 'utf8'));
  ok('Server package manifest', pkg.version || 'present');
} catch (err) {
  fail('Server package manifest', err.message);
}

const dist = path.join(root, 'web', 'dist');
const index = path.join(dist, 'index.html');
if (fs.existsSync(index)) {
  const html = fs.readFileSync(index, 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((v) => v.startsWith('/assets/'));
  if (assets.length) ok('Production dashboard entrypoint', assets.length + ' asset references');
  else fail('Production dashboard entrypoint', 'No /assets references found');

  for (const asset of assets) {
    if (fs.existsSync(path.join(dist, asset.slice(1)))) ok('Asset ' + asset);
    else fail('Asset ' + asset, 'missing from web/dist');
  }
} else {
  fail('Production dashboard', 'web/dist/index.html missing');
}

if (process.env.NODE_ENV === 'production' && process.env.WABOT_ALLOW_ANY_ORIGIN === 'true') {
  fail('CORS configuration', 'WABOT_ALLOW_ANY_ORIGIN=true is unsafe for production');
} else {
  ok('CORS configuration');
}

const health = await checkFetch('Health endpoint', base + '/api/health');
if (health) {
  try {
    const data = await health.json();
    if (data?.ok === true && typeof data.status === 'string') ok('Health payload', data.status);
    else fail('Health payload', 'unexpected response shape');
  } catch (err) {
    fail('Health payload', err.message);
  }
}

await checkFetch('Protected API rejects anonymous access', base + '/api/state', {}, 401);
await checkFetch('Loopback token endpoint', base + '/api/auth/token');

const rootRes = await checkFetch('Dashboard HTTP', base + '/');
if (rootRes) {
  const html = await rootRes.text();
  if (html.includes('<div id="root">') || html.includes('id="root"')) ok('Dashboard HTML');
  else fail('Dashboard HTML', 'React root not found');
}

console.log('\n' + (failed ? 'Doctor found ' + failed + ' problem(s).' : 'All checks passed.') + '\n');
process.exitCode = failed ? 1 : 0;

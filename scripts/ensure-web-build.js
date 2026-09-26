#!/usr/bin/env node
/**
 * WaBot Pro — production web build guard.
 *
 * The server serves web/dist directly. This guard prevents a common deployment
 * failure where web/src is newer than the committed/prebuilt web/dist bundle.
 *
 * It is intentionally cross-platform so CLI, Windows, Linux, macOS and Termux
 * can all use the same check.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = path.join(ROOT_DIR, 'web');
const DIST_DIR = path.join(WEB_DIR, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');

function latestMtime(target) {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.mtimeMs;

  let latest = stat.mtimeMs;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    latest = Math.max(latest, latestMtime(path.join(target, entry.name)));
  }
  return latest;
}

function referencedAssetsArePresent() {
  if (!fs.existsSync(DIST_INDEX)) return false;

  const html = fs.readFileSync(DIST_INDEX, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);

  if (!refs.length) return false;

  return refs.every((ref) => fs.existsSync(path.join(DIST_DIR, ref.replace(/^\/+/, ''))));
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function ensureWebBuild({ force = false } = {}) {
  const sourceMtime = Math.max(
    latestMtime(path.join(WEB_DIR, 'src')),
    latestMtime(path.join(WEB_DIR, 'index.html')),
    latestMtime(path.join(WEB_DIR, 'vite.config.js')),
    latestMtime(path.join(WEB_DIR, 'package.json')),
    latestMtime(path.join(WEB_DIR, 'package-lock.json'))
  );

  const distMtime = fs.existsSync(DIST_INDEX) ? fs.statSync(DIST_INDEX).mtimeMs : 0;
  const needsBuild =
    force ||
    !fs.existsSync(DIST_INDEX) ||
    sourceMtime > distMtime ||
    !referencedAssetsArePresent();

  if (!needsBuild) {
    console.log('✓ Web dashboard build is up to date.');
    return;
  }

  console.log('⚙️  Web dashboard build is missing or stale. Rebuilding...');

  if (!fs.existsSync(path.join(WEB_DIR, 'node_modules'))) {
    console.log('📦 Installing web dependencies...');
    run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
      '--prefix',
      'web',
      'install',
      '--include=dev',
      '--no-audit',
      '--no-fund',
    ]);
  }

  console.log('🏗️  Building React dashboard...');
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--prefix', 'web', 'run', 'build']);

  if (!fs.existsSync(DIST_INDEX) || !referencedAssetsArePresent()) {
    console.error('❌ Dashboard build completed but web/dist is incomplete.');
    process.exit(1);
  }

  console.log('✅ Dashboard build is ready.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  ensureWebBuild({ force: process.argv.includes('--force') });
}

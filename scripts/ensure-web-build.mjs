#!/usr/bin/env node
/**
 * Verify that the Vite production dashboard matches the current web source.
 *
 * Why this exists:
 * Vite uses hashed filenames for production assets. If index.html from one
 * build is served with assets from another build, browsers can show a blank
 * dashboard. This check makes every normal deployment self-healing.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'web');
const distDir = path.join(webDir, 'dist');
const manifestPath = path.join(distDir, '.wabot-build.json');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(path.relative(webDir, full).replaceAll(path.sep, '/'));
  }
  return files.sort();
}

function sourceHash() {
  const hash = crypto.createHash('sha256');
  for (const rel of walk(webDir)) {
    hash.update(rel);
    hash.update(fs.readFileSync(path.join(webDir, rel)));
  }
  return hash.digest('hex');
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function needsBuild(currentHash) {
  const index = path.join(distDir, 'index.html');
  if (!fs.existsSync(index) || !fs.existsSync(manifestPath)) return true;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.sourceHash !== currentHash) return true;

    const html = fs.readFileSync(index, 'utf8');
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((v) => v.startsWith('/assets/'));

    return assets.some((asset) => !fs.existsSync(path.join(distDir, asset.slice(1))));
  } catch {
    return true;
  }
}

const repair = process.argv.includes('--repair');

// Docker/packaged deployments may intentionally contain only web/dist.
// Validate the packaged build when the frontend source tree is not shipped.
if (!fs.existsSync(webDir) || !fs.existsSync(path.join(webDir, 'src'))) {
  const index = path.join(distDir, 'index.html');
  if (!fs.existsSync(index)) {
    console.error('✗ Dashboard is missing: web/dist/index.html was not found.');
    process.exit(1);
  }
  const html = fs.readFileSync(index, 'utf8');
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((v) => v.startsWith('/assets/'));
  const missing = assets.filter((asset) => !fs.existsSync(path.join(distDir, asset.slice(1))));
  if (missing.length) {
    console.error('✗ Dashboard build references missing assets:');
    missing.forEach((asset) => console.error(`  - ${asset}`));
    process.exit(1);
  }
  console.log('✓ Packaged dashboard build verified.');
  process.exit(0);
}

const hash = sourceHash();

if (!needsBuild(hash)) {
  console.log('✓ Dashboard build is up to date.');
  process.exit(0);
}

if (!repair) {
  console.error('✗ Dashboard build is missing or stale.');
  console.error('  Run: npm run web:repair');
  process.exit(1);
}

console.log('⚙ Dashboard build is missing/stale. Rebuilding frontend...');

if (!fs.existsSync(path.join(webDir, 'node_modules'))) {
  run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
    '--prefix', 'web', 'install', '--no-audit', '--no-fund'
  ]);
}

run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--prefix', 'web', 'run', 'build']);

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error('Vite build completed but web/dist/index.html was not generated.');
}

fs.writeFileSync(
  manifestPath,
  JSON.stringify({
    sourceHash: hash,
    builtAt: new Date().toISOString(),
  }, null, 2) + '\n'
);

console.log('✓ Dashboard rebuilt and verified.');

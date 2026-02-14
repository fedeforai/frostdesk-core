#!/usr/bin/env node
/**
 * Generates a HS256 JWT for admin debug (Auth Debug panel).
 * Uses SUPABASE_JWT_SECRET from env or repo root .env (Supabase Dashboard → Settings → API → JWT Secret).
 * Usage:
 *   SUPABASE_JWT_SECRET='your-secret' node scripts/gen_admin_jwt.mjs
 *   # or put SUPABASE_JWT_SECRET in .env and run:
 *   node scripts/gen_admin_jwt.mjs
 * Optional: SUB and EMAIL override payload (default sub/email for admin).
 */
import { createHmac } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getRepoRoot(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return dir;
    dir = parent;
  }
}

const repoRoot = getRepoRoot(__dirname);
const rootEnv = join(repoRoot, '.env');
if (existsSync(rootEnv)) {
  const content = readFileSync(rootEnv, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
}

const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret || secret === 'SUPABASE_JWT_SECRET') {
  console.error('Set SUPABASE_JWT_SECRET (env or in .env). Get it from Supabase Dashboard → Settings → API → JWT Secret.');
  process.exit(1);
}

const sub = process.env.SUB || '34afed67-021a-4c18-b33c-8ae69ec1509a';
const email = process.env.EMAIL || 'solivras@gmail.com';
const now = Math.floor(Date.now() / 1000);
const payload = {
  sub,
  email,
  role: 'admin',
  aud: 'authenticated',
  exp: now + 10 * 365 * 24 * 3600,
  iat: now,
  'https://hasura.io/jwt/claims': {
    'x-hasura-default-role': 'admin',
    'x-hasura-allowed-roles': ['admin', 'authenticated'],
    'x-hasura-user-id': sub,
  },
};

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const header = { alg: 'HS256', typ: 'JWT' };
const headerB64 = base64url(Buffer.from(JSON.stringify(header), 'utf8'));
const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
const signingInput = `${headerB64}.${payloadB64}`;
const sig = createHmac('sha256', secret).update(signingInput).digest();
const sigB64 = base64url(sig);
const token = `${signingInput}.${sigB64}`;

console.log(token);

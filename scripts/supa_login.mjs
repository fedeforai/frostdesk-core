#!/usr/bin/env node
/**
 * Prints a Supabase access_token for testing /admin/check.
 * Reads repo root .env (SUPABASE_URL, SUPABASE_ANON_KEY). Uses TEST_EMAIL and TEST_PASSWORD from env.
 * Run from repo root or apps/web: node scripts/supa_login.mjs or node ../../scripts/supa_login.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getRepoRoot(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml')) || existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      console.error('Repo root not found (no pnpm-workspace.yaml or .git)');
      process.exit(1);
    }
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

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in repo root .env (or env)');
  process.exit(1);
}

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
if (!email || !password) {
  console.error('Set TEST_EMAIL and TEST_PASSWORD (env or in .env)');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(url, key);
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  console.error('Sign-in error:', error.message);
  process.exit(1);
}
if (!data?.session?.access_token) {
  console.error('No session or access_token');
  process.exit(1);
}
console.log(data.session.access_token);

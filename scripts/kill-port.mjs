#!/usr/bin/env node
/**
 * Kills any process listening on the given TCP port.
 * Usage: node kill-port.mjs [port]
 * Default port: 3002
 * No-op if nothing is listening. Safe to run before starting a dev server.
 */

import { execSync } from 'child_process';

const port = parseInt(process.argv[2], 10) || 3002;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Invalid port. Use a number between 1 and 65535.');
  process.exit(1);
}

let pids = [];
try {
  const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' });
  pids = out.trim().split(/\s+/).filter(Boolean);
} catch {
  // lsof exits non-zero when no process found
}

for (const pid of pids) {
  if (!pid) continue;
  console.log(`Killing PID ${pid} on port ${port}`);
  try {
    execSync(`kill -9 ${pid}`);
  } catch {
    process.exit(1);
  }
}

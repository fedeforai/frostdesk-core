/**
 * Load .env before any other app code so process.env is set for @frostdesk/db etc.
 * Repo root is found by walking up from this file until pnpm-workspace.yaml or .git (works for both src/ and dist/).
 * Loads the first existing file in candidates; throws if none found.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { getRepoRoot } from './getRepoRoot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = getRepoRoot(__dirname);
const apiDir = path.join(repoRoot, 'apps', 'api');
const candidates = [
  path.join(repoRoot, '.env.local'),
  path.join(repoRoot, '.env'),
  path.join(apiDir, '.env.local'),
  path.join(apiDir, '.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let loadedEnvPath: string | null = null;
for (const envPath of candidates) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedEnvPath = loadedEnvPath ?? envPath;
  }
}

if (!loadedEnvPath) {
  throw new Error(
    `No .env file found. Tried (first existing wins): ${candidates.join(', ')}`
  );
}

/** Returns the path of the .env file that was loaded. */
export function getLoadedEnvPath(): string | null {
  return loadedEnvPath;
}

/**
 * Load .env before any other app code so process.env is set for @frostdesk/db etc.
 * Tries multiple paths so one works regardless of cwd or tsx resolution:
 * - cwd/.env (when run from repo root)
 * - cwd/../.env (when run from apps/api)
 * - path relative to this file: apps/api/src -> ../../.env
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const envPath of candidates) {
  dotenv.config({ path: envPath });
}
dotenv.config();

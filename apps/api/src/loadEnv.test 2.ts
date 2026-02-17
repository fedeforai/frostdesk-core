import { describe, it, expect } from 'vitest';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { getRepoRoot } from './getRepoRoot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('loadEnv', () => {
  it('when repo root .env exists, getLoadedEnvPath() is set and SUPABASE_URL is present', async () => {
    const repoRoot = getRepoRoot(__dirname);
    const envPath = path.join(repoRoot, '.env');
    if (!existsSync(envPath)) {
      return; // skip when no .env at repo root
    }
    const m = await import('./loadEnv.js');
    expect(m.getLoadedEnvPath()).not.toBeNull();
    expect(process.env.SUPABASE_URL).toBeTruthy();
  });
});

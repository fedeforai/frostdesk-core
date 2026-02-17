import path from 'path';
import { existsSync } from 'fs';

/**
 * Walk up from startDir until we find pnpm-workspace.yaml or .git; that directory is repo root.
 * Used so env loading works from both apps/api/src and apps/api/dist.
 * If not found (e.g. container only has apps/api), returns process.cwd() so loadEnv can still build paths and not throw.
 */
export function getRepoRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (;;) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml')) || existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return process.cwd();
    }
    dir = parent;
  }
}

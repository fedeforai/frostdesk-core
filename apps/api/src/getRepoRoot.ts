import path from 'path';
import { existsSync } from 'fs';

/**
 * Walk up from startDir until we find pnpm-workspace.yaml or .git; that directory is repo root.
 * Used so env loading works from both apps/api/src and apps/api/dist.
 */
export function getRepoRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (;;) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml')) || existsSync(path.join(dir, '.git'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('Repo root not found (no pnpm-workspace.yaml or .git)');
    }
    dir = parent;
  }
}

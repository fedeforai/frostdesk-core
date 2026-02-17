#!/usr/bin/env tsx
/**
 * Apply a SQL migration file to the local database.
 * Usage: pnpm exec tsx apps/api/src/dev/apply_migration.ts <path-to-sql-file>
 */
import '../loadEnv.js';
import { sql } from '@frostdesk/db';
import fs from 'fs';

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  console.error('Usage: tsx apps/api/src/dev/apply_migration.ts <path-to-sql-file>');
  process.exit(1);
}

const migration = fs.readFileSync(filePath, 'utf-8');
console.log(`Applying: ${filePath}`);
try {
  await sql.unsafe(migration);
  console.log('Done.');
} catch (err: any) {
  console.error('Migration error:', err.message ?? err);
  process.exit(1);
}
process.exit(0);

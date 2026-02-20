#!/usr/bin/env tsx
import '../loadEnv.js';
import { sql } from '@frostdesk/db';

const query = process.argv[2];
if (!query) { console.error('Usage: tsx apps/api/src/dev/query.ts "SELECT ..."'); process.exit(1); }
const rows = await sql.unsafe(query);
console.table(rows);
process.exit(0);

#!/usr/bin/env tsx
/**
 * Dedup Messages — removes duplicate inbound messages within conversations.
 *
 * For each conversation belonging to the given instructor, finds inbound messages
 * with identical message_text, keeps only the oldest, deletes the rest
 * (plus their inbound_messages, ai_snapshots, ai_drafts).
 *
 * Usage:
 *   DEDUP_INSTRUCTOR_ID=<uuid> pnpm -C apps/api exec tsx src/dev/dedup_messages.ts
 *
 * Dry-run (default): prints what would be deleted without touching data.
 *   DEDUP_DRY_RUN=false  to actually delete.
 */

import '../loadEnv.js';
import { sql } from '@frostdesk/db';

const _rawId = process.env.DEDUP_INSTRUCTOR_ID?.trim();
if (!_rawId || !/^[0-9a-fA-F-]{36}$/.test(_rawId)) {
  console.error(
    '❌ DEDUP_INSTRUCTOR_ID is required (UUID).\n' +
      'Example: DEDUP_INSTRUCTOR_ID=59a7c6d1-... pnpm -C apps/api exec tsx src/dev/dedup_messages.ts'
  );
  process.exit(1);
}
const INSTRUCTOR_ID: string = _rawId;
const DRY_RUN = process.env.DEDUP_DRY_RUN !== 'false';

async function main() {
  console.log('=== Dedup Messages ===');
  console.log(`Instructor: ${INSTRUCTOR_ID}`);
  console.log(`Mode:       ${DRY_RUN ? 'DRY RUN (DEDUP_DRY_RUN=false to execute)' : 'LIVE DELETE'}`);
  console.log('');

  // Find all duplicate inbound messages per conversation:
  // same conversation_id + same message_text, more than 1 row.
  // For each group, keep the row with the smallest created_at (oldest).
  const dupRows = await sql<Array<{
    id: string;
    conversation_id: string;
    message_text: string;
    external_message_id: string | null;
    created_at: string;
    customer_identifier: string;
  }>>`
    WITH ranked AS (
      SELECT
        m.id,
        m.conversation_id,
        m.message_text,
        m.external_message_id,
        m.created_at,
        c.customer_identifier,
        ROW_NUMBER() OVER (
          PARTITION BY m.conversation_id, m.message_text
          ORDER BY m.created_at ASC
        ) AS rn
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.instructor_id = ${INSTRUCTOR_ID}::uuid
        AND m.direction = 'inbound'
    )
    SELECT id, conversation_id, message_text, external_message_id, created_at, customer_identifier
    FROM ranked
    WHERE rn > 1
    ORDER BY customer_identifier, created_at
  `;

  if (dupRows.length === 0) {
    console.log('No duplicates found. Nothing to do.');
    process.exit(0);
  }

  console.log(`Found ${dupRows.length} duplicate message(s) to remove:\n`);

  for (const row of dupRows) {
    console.log(
      `  ${row.customer_identifier} | "${row.message_text.slice(0, 50)}…" ` +
        `| id=${row.id.slice(0, 8)}… | ${row.created_at}`
    );
  }

  if (DRY_RUN) {
    console.log(`\nDry run — ${dupRows.length} row(s) would be deleted. Set DEDUP_DRY_RUN=false to execute.`);
    process.exit(0);
  }

  // Actually delete
  const deleteIds = dupRows.map((r) => r.id);
  const extIds = dupRows
    .map((r) => r.external_message_id)
    .filter((e): e is string => e !== null && e !== undefined);

  // Delete in dependency order; tables may not exist — wrap each in try/catch
  console.log('\nDeleting...');

  async function tryDelete(label: string, query: Promise<any>): Promise<number> {
    try {
      const result = await query;
      const count = result.count ?? 0;
      console.log(`  ${label.padEnd(20)} ${count} deleted`);
      return count;
    } catch (err: any) {
      if (err?.code === '42P01' || err?.code === '42703') {
        // relation does not exist or column does not exist — skip silently
        console.log(`  ${label.padEnd(20)} (table/column not found, skipped)`);
        return 0;
      }
      throw err;
    }
  }

  await tryDelete('ai_drafts', sql`DELETE FROM ai_drafts WHERE message_id = ANY(${deleteIds}::uuid[])`);
  await tryDelete('ai_snapshots', sql`DELETE FROM ai_snapshots WHERE message_id = ANY(${deleteIds}::uuid[])`);
  await tryDelete('message_metadata', sql`DELETE FROM message_metadata WHERE message_id = ANY(${deleteIds}::uuid[])`);
  await tryDelete('messages', sql`DELETE FROM messages WHERE id = ANY(${deleteIds}::uuid[])`);

  if (extIds.length > 0) {
    await tryDelete('inbound_messages', sql`DELETE FROM inbound_messages WHERE external_message_id = ANY(${extIds}::text[])`);
  }

  console.log(`\n✔ Removed ${deleteIds.length} duplicate(s).`);
  console.log('=== Done ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});

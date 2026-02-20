#!/usr/bin/env tsx
/**
 * Simulate Single Booking Request — sends a complete booking-request message
 * through the production inbound pipeline and captures the AI draft output.
 *
 * Flow (identical to real WhatsApp webhook):
 *   1. Upsert customer_profiles (source='whatsapp')
 *   2. resolveConversationByChannel
 *   3. persistInboundMessageWithInboxBridge
 *   4. orchestrateInboundDraft  →  AI classification + draft
 *
 * The script does NOT create bookings — only the draft preview artifacts.
 *
 * Usage (from repo root):
 *   SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 \
 *     pnpm -C apps/api exec tsx src/dev/sim_single_booking_request.ts
 *
 * Env vars:
 *   SIM_INSTRUCTOR_ID  (required)  instructor profile UUID
 *   SIM_PHONE          (optional)  default +447712345021
 *   SIM_CUSTOMER_NAME  (optional)  default "Sara Johnson"
 *   SIM_MESSAGE_TEXT   (optional)  default: complete booking request (see below)
 */

// ── Load env (same as API) ──────────────────────────────────────────────────
import '../loadEnv.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  sql,
  resolveConversationByChannel,
  persistInboundMessageWithInboxBridge,
  orchestrateInboundDraft,
  createOrGetCustomerProfile,
  normalizePhone,
  listAuditSince,
} from '@frostdesk/db';

import { getRepoRoot } from '../getRepoRoot.js';

// ── Resolve paths ───────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = getRepoRoot(__dirname);

// ── Config ──────────────────────────────────────────────────────────────────
const _rawId = process.env.SIM_INSTRUCTOR_ID?.trim();
if (!_rawId || !/^[0-9a-fA-F-]{36}$/.test(_rawId)) {
  console.error(
    '❌  SIM_INSTRUCTOR_ID env var is required (UUID).\n' +
      'Example:\n' +
      '  SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 \\\n' +
      '    pnpm -C apps/api exec tsx src/dev/sim_single_booking_request.ts'
  );
  process.exit(1);
}
const INSTRUCTOR_ID: string = _rawId;
const PHONE = normalizePhone(process.env.SIM_PHONE?.trim() || '+447712345021');
const CUSTOMER_NAME = process.env.SIM_CUSTOMER_NAME?.trim() || 'Sara Johnson';
const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');

const DEFAULT_MESSAGE =
  'Hi! I\'d like to book a private ski lesson in Courchevel 1850 on 2026-02-21. ' +
  'Start 10:00 and end 12:00 (2 hours). 2 adults, intermediate level. ' +
  'Preferred meeting point: Croisette / Jardin Alpin lift area. ' +
  'If you have availability please confirm and tell me the total price. ' +
  'My name is Sara, this number is correct.';

const MESSAGE_TEXT = process.env.SIM_MESSAGE_TEXT?.trim() || DEFAULT_MESSAGE;

// Deterministic external ID so re-running is idempotent (old snapshots cleaned)
const EXTERNAL_ID = `sim_booking_${INSTRUCTOR_ID.slice(0, 8)}_${PHONE.replace(/\+/g, '')}`;

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const ts0 = new Date().toISOString();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎿  Single Booking Request Simulation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Instructor : ${INSTRUCTOR_ID}`);
  console.log(`Phone      : ${PHONE}`);
  console.log(`Customer   : ${CUSTOMER_NAME}`);
  console.log(`Message    : ${MESSAGE_TEXT.slice(0, 80)}…`);
  console.log();

  // 1) Upsert customer profile
  console.log('[1/5] Upserting customer profile…');
  const customer = await createOrGetCustomerProfile(
    INSTRUCTOR_ID,
    PHONE,
    CUSTOMER_NAME,
    'whatsapp'
  );
  console.log(`  ✔ customer_profiles.id = ${customer.id}`);

  // 2) Resolve / create conversation
  console.log('[2/5] Resolving conversation…');
  const conversation = await resolveConversationByChannel(
    'whatsapp',
    PHONE,
    INSTRUCTOR_ID
  );
  const conversationId = conversation.id;
  console.log(`  ✔ conversation.id = ${conversationId}`);

  // 3) Clear previous AI snapshots for this external_id so orchestrator re-runs
  //    (only for the simulated message, not production data)
  console.log('[3/5] Clearing previous snapshots for idempotent re-run…');
  const prevMsgRows = await sql<Array<{ id: string }>>`
    SELECT m.id FROM messages m
    WHERE m.conversation_id = ${conversationId}::uuid
      AND m.external_message_id = ${EXTERNAL_ID}
      AND m.direction = 'inbound'
  `;
  if (prevMsgRows.length > 0) {
    const prevMsgIds = prevMsgRows.map((r) => r.id);
    // Delete ai_snapshots for these messages so orchestrator doesn't short-circuit
    const snapDel = await sql`DELETE FROM ai_snapshots WHERE message_id = ANY(${prevMsgIds}::uuid[])`;
    console.log(`  ✔ Cleared ${snapDel.count} previous ai_snapshots`);
    // Delete previous ai_drafts for this conversation (proposed only)
    const draftDel = await sql`
      DELETE FROM ai_drafts
      WHERE conversation_id = ${conversationId}::uuid
        AND instructor_id = ${INSTRUCTOR_ID}::uuid
        AND state = 'proposed'
    `;
    console.log(`  ✔ Cleared ${draftDel.count} previous proposed ai_drafts`);
  } else {
    console.log('  (no previous messages for this external_id)');
  }

  // 4) Persist inbound message
  console.log('[4/5] Persisting inbound message…');
  const inboundMsgId = await persistInboundMessageWithInboxBridge({
    conversationId,
    channel: 'whatsapp',
    externalMessageId: EXTERNAL_ID,
    senderIdentity: PHONE,
    messageText: MESSAGE_TEXT,
    receivedAt: new Date(),
    rawPayload: {
      sim: true,
      run_ts: RUN_TS,
      customer_name: CUSTOMER_NAME,
    },
  });
  console.log(`  ✔ inbound_message.id = ${inboundMsgId}`);

  // Look up the message.id in the messages table (bridge inserts into both)
  const msgRows = await sql<Array<{ id: string }>>`
    SELECT id FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND external_message_id = ${EXTERNAL_ID}
      AND direction = 'inbound'
    ORDER BY created_at DESC LIMIT 1
  `;
  const messageId = msgRows.length > 0 ? msgRows[0].id : null;
  console.log(`  ✔ messages.id = ${messageId ?? '(not found)'}`);

  // 5) Run orchestrateInboundDraft (AI classification + draft)
  console.log('[5/5] Running orchestrateInboundDraft…');
  let orchResult: { snapshotId: string; draftGenerated: boolean } | null = null;
  let orchError: string | null = null;
  try {
    orchResult = await orchestrateInboundDraft({
      conversationId,
      externalMessageId: EXTERNAL_ID,
      messageText: MESSAGE_TEXT,
      channel: 'whatsapp',
      language: 'en',
    });
    console.log(`  ✔ snapshot.id = ${orchResult.snapshotId}`);
    console.log(`  ✔ draftGenerated = ${orchResult.draftGenerated}`);
  } catch (err) {
    orchError = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ orchestration failed: ${orchError}`);
  }

  // ── Gather evidence ──────────────────────────────────────────────────────

  // AI snapshot
  let snapshotInfo: Record<string, unknown> | null = null;
  if (messageId) {
    const snapRows = await sql<Array<Record<string, unknown>>>`
      SELECT id, relevant, relevance_confidence, relevance_reason, intent, intent_confidence, model
      FROM ai_snapshots
      WHERE message_id = ${messageId}::uuid
      ORDER BY created_at DESC LIMIT 1
    `;
    snapshotInfo = snapRows.length > 0 ? snapRows[0] : null;
  }

  // AI draft (from ai_drafts table — what the Inbox UI reads)
  const draftRows = await sql<Array<{
    id: string;
    state: string;
    draft_text: string;
    created_at: string;
    expires_at: string | null;
  }>>`
    SELECT id, state, draft_text, created_at, expires_at
    FROM ai_drafts
    WHERE conversation_id = ${conversationId}::uuid
      AND instructor_id = ${INSTRUCTOR_ID}::uuid
    ORDER BY created_at DESC LIMIT 1
  `;
  const draftInfo = draftRows.length > 0 ? draftRows[0] : null;

  // Audit log rows
  const auditRows = await listAuditSince(ts0, 50);
  const relevantAudit = auditRows.filter(
    (r) => r.entity_id === conversationId || r.entity_id === messageId
  );

  // ── Print summary ────────────────────────────────────────────────────────
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊  RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`conversation_id : ${conversationId}`);
  console.log(`message_id      : ${messageId ?? '—'}`);
  console.log(`inbound_msg_id  : ${inboundMsgId}`);
  console.log();

  if (snapshotInfo) {
    console.log('AI SNAPSHOT:');
    console.log(`  relevant            : ${snapshotInfo.relevant}`);
    console.log(`  relevance_confidence: ${snapshotInfo.relevance_confidence}`);
    console.log(`  relevance_reason    : ${snapshotInfo.relevance_reason}`);
    console.log(`  intent              : ${snapshotInfo.intent}`);
    console.log(`  intent_confidence   : ${snapshotInfo.intent_confidence}`);
    console.log(`  model               : ${snapshotInfo.model}`);
  } else {
    console.log('AI SNAPSHOT: (none)');
  }
  console.log();

  if (draftInfo) {
    console.log('AI DRAFT (ai_drafts table):');
    console.log(`  id         : ${draftInfo.id}`);
    console.log(`  state      : ${draftInfo.state}`);
    console.log(`  created_at : ${draftInfo.created_at}`);
    console.log(`  expires_at : ${draftInfo.expires_at}`);
    console.log(`  draft_text :`);
    const cleanText = draftInfo.draft_text
      .replace(/^Suggested reply for human review\.?\s*/i, '')
      .trim();
    for (const line of cleanText.split('\n')) {
      console.log(`    ${line}`);
    }
  } else {
    console.log('AI DRAFT: (none generated)');
    if (orchError) console.log(`  error: ${orchError}`);
  }
  console.log();

  if (relevantAudit.length > 0) {
    console.log(`AUDIT LOG (${relevantAudit.length} rows):`);
    for (const a of relevantAudit) {
      console.log(`  [${a.action}] entity=${a.entity_type}/${a.entity_id?.slice(0, 8)}… severity=${a.severity}`);
    }
  } else {
    console.log('AUDIT LOG: (no rows for this simulation)');
  }

  // ── Write markdown report ────────────────────────────────────────────────
  const reportsDir = path.join(REPO_ROOT, 'docs', 'sim_reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, `single_${RUN_TS}.md`);

  const md = `# Single Booking Request Simulation

**Run**: ${new Date().toISOString()}
**Instructor**: \`${INSTRUCTOR_ID}\`
**Customer**: ${CUSTOMER_NAME} (${PHONE})

## Input Message

\`\`\`
${MESSAGE_TEXT}
\`\`\`

## IDs

| Entity | ID |
|--------|-----|
| conversation_id | \`${conversationId}\` |
| message_id | \`${messageId ?? '—'}\` |
| inbound_message_id | \`${inboundMsgId}\` |
| snapshot_id | \`${orchResult?.snapshotId ?? '—'}\` |
| draft_id | \`${draftInfo?.id ?? '—'}\` |

## AI Classification (Snapshot)

| Field | Value |
|-------|-------|
| relevant | ${snapshotInfo?.relevant ?? '—'} |
| relevance_confidence | ${snapshotInfo?.relevance_confidence ?? '—'} |
| relevance_reason | ${snapshotInfo?.relevance_reason ?? '—'} |
| intent | ${snapshotInfo?.intent ?? '—'} |
| intent_confidence | ${snapshotInfo?.intent_confidence ?? '—'} |
| model | ${snapshotInfo?.model ?? '—'} |

## AI Draft

${draftInfo ? `- **state**: ${draftInfo.state}
- **created_at**: ${draftInfo.created_at}
- **expires_at**: ${draftInfo.expires_at ?? 'none'}

### Draft Text

\`\`\`
${draftInfo.draft_text}
\`\`\`
` : '*(No draft generated)*'}
${orchError ? `\n**Error**: ${orchError}\n` : ''}

## Audit Log (${relevantAudit.length} rows)

${relevantAudit.length > 0
  ? relevantAudit.map((a) => `- **${a.action}** entity=${a.entity_type}/${a.entity_id} severity=${a.severity}`).join('\n')
  : '*(none)*'}

## What to verify in UI

1. Open **Inbox** → Select conversation with **${CUSTOMER_NAME}**
2. The inbound message should appear: "${MESSAGE_TEXT.slice(0, 60)}…"
3. Below the messages, the **AI Suggested Reply** card should appear with Insert/Regenerate/Dismiss buttons
4. The draft text should be a response acknowledging the booking request
`;

  fs.writeFileSync(reportPath, md, 'utf-8');
  console.log(`\n📝 Report → ${path.relative(REPO_ROOT, reportPath)}`);

  // ── Exit ─────────────────────────────────────────────────────────────────
  console.log('\n✅ Done. Open the Instructor Inbox to see the result.');
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Seed Inbox Customers — demo-ready inbox data for Instructor app.
 *
 * - All messages in English.
 * - One conversation per scenario (dedicated demo phone numbers).
 * - Before seeding: clears existing messages and drafts for those conversations
 *   so each run gives a clean slate.
 *
 * Uses the same production pipeline as the WhatsApp webhook:
 *   resolveConversationByChannel → persistInboundMessageWithInboxBridge → orchestrateInboundDraft
 *
 * Usage (from repo root):
 *   SEED_INSTRUCTOR_ID=<uuid> pnpm -C apps/api exec tsx src/dev/seed_inbox_customers.ts
 *
 * Output: docs/sim_reports/seed_inbox_<timestamp>.md
 */

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
  listConversationAuditSince,
  seedBookingForTest,
  linkConversationToCustomer,
} from '@frostdesk/db';
import type { SimAuditRow, InboundDraftOrchestratorResult } from '@frostdesk/db';

import { getRepoRoot } from '../getRepoRoot.js';

// ── Resolve paths ───────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = getRepoRoot(__dirname);

// ── Config ──────────────────────────────────────────────────────────────────
const _rawId = process.env.SEED_INSTRUCTOR_ID?.trim();
if (!_rawId || !/^[0-9a-fA-F-]{36}$/.test(_rawId)) {
  console.error(
    '❌  SEED_INSTRUCTOR_ID env var is required (UUID).\n' +
      'Example: SEED_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 ' +
      'pnpm -C apps/api exec tsx src/dev/seed_inbox_customers.ts'
  );
  process.exit(1);
}
const INSTRUCTOR_ID: string = _rawId;
const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');

// ── Date helpers ────────────────────────────────────────────────────────────
function tomorrowAt(hours: number, minutes: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function daysAgo(n: number, hours: number, minutes: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ── Personas: one phone per scenario for clean, repeatable demos ─────────────
interface Persona {
  key: string;
  displayName: string;
  phone: string;
}

const PERSONAS: Persona[] = [
  { key: 'A', displayName: 'Alice', phone: '+15550000001' },
  { key: 'B', displayName: 'Sara', phone: '+15550000002' },
  { key: 'C', displayName: 'Marco', phone: '+15550000003' },
  { key: 'D', displayName: 'Rosa', phone: '+15550000004' },
  { key: 'E', displayName: 'Elena', phone: '+15550000005' },
  { key: 'F', displayName: 'Paolo', phone: '+15550000006' },
  { key: 'G', displayName: 'Sara', phone: '+15550000007' },
  { key: 'H', displayName: 'Marco', phone: '+15550000008' },
];

// ── Scenarios ───────────────────────────────────────────────────────────────
interface PrerequisiteBooking {
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'completed';
  notes?: string;
}

interface Scenario {
  id: string;
  label: string;
  personaKey: string;
  messages: string[];
  language: string;
  prerequisiteBooking?: PrerequisiteBooking;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'A',
    label: 'info-prices',
    personaKey: 'A',
    language: 'en',
    messages: [
      'How much does a 2-hour private ski lesson cost?',
    ],
  },
  {
    id: 'B',
    label: 'booking-complete',
    personaKey: 'B',
    language: 'en',
    messages: [
      `I'd like a private lesson tomorrow ${tomorrowDate()} from 10:00 to 12:00, 2 adults, Courchevel 1850. My name is Sara.`,
    ],
  },
  {
    id: 'C',
    label: 'reschedule-verified',
    personaKey: 'C',
    language: 'en',
    prerequisiteBooking: {
      startTime: tomorrowAt(9, 0),
      endTime: tomorrowAt(11, 0),
      status: 'confirmed',
      notes: 'Seed: pre-existing booking for reschedule test',
    },
    messages: [
      'Can we move my lesson tomorrow from 09:00-11:00 to 11:00-13:00? Same meeting point.',
    ],
  },
  {
    id: 'D',
    label: 'off-topic',
    personaKey: 'D',
    language: 'en',
    messages: [
      "Don't forget to call grandma tonight. Love you.",
    ],
  },
  {
    id: 'E',
    label: 'cancel-request',
    personaKey: 'E',
    language: 'en',
    prerequisiteBooking: {
      startTime: tomorrowAt(10, 0),
      endTime: tomorrowAt(12, 0),
      status: 'confirmed',
      notes: 'Seed: pre-existing booking for cancellation test',
    },
    messages: [
      'I need to cancel my lesson tomorrow, I hurt my knee.',
    ],
  },
  {
    id: 'F',
    label: 'availability-check',
    personaKey: 'F',
    language: 'en',
    messages: [
      'Are you free Thursday morning for a ski lesson?',
    ],
  },
  {
    id: 'G',
    label: 'repeat-booking',
    personaKey: 'G',
    language: 'en',
    prerequisiteBooking: {
      startTime: daysAgo(7, 10, 0),
      endTime: daysAgo(7, 12, 0),
      status: 'completed',
      notes: 'Seed: completed booking for repeat-booking test. 2h private ski lesson.',
    },
    messages: [
      "I'd like to book again like last time, same details.",
    ],
  },
  {
    id: 'H',
    label: 'ambiguity',
    personaKey: 'H',
    language: 'en',
    messages: [
      "On second thought, maybe 2pm is better. I'm not sure yet, I'll confirm tomorrow.",
    ],
  },
];

// ── Cleanup: clear messages and drafts for a conversation (clean slate) ──────
async function clearConversationForDemo(conversationId: string): Promise<void> {
  await sql`DELETE FROM ai_snapshots WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ${conversationId}::uuid)`;
  await sql`DELETE FROM messages WHERE conversation_id = ${conversationId}::uuid`;
  await sql`DELETE FROM inbound_messages WHERE conversation_id = ${conversationId}::uuid`;
  await sql`DELETE FROM ai_drafts WHERE conversation_id = ${conversationId}::uuid`;
}

// ── Per-scenario result ─────────────────────────────────────────────────────
interface ScenarioResult {
  scenario: Scenario;
  persona: Persona;
  customerId: string;
  conversationId: string;
  seededBookingId: string | null;
  messageIds: string[];
  orchestratorResults: Array<InboundDraftOrchestratorResult | null>;
  orchestratorErrors: string[];
  auditRows: SimAuditRow[];
  durationMs: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function deterministicExternalId(scenarioId: string, idx: number): string {
  return `seed_inbox_${INSTRUCTOR_ID.slice(0, 8)}_${scenarioId}_${idx}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Run one scenario ────────────────────────────────────────────────────────
async function runScenario(sc: Scenario): Promise<ScenarioResult> {
  const persona = PERSONAS.find((p) => p.key === sc.personaKey)!;
  const ts0 = new Date().toISOString();
  const start = Date.now();

  const result: ScenarioResult = {
    scenario: sc,
    persona,
    customerId: '',
    conversationId: '',
    seededBookingId: null,
    messageIds: [],
    orchestratorResults: [],
    orchestratorErrors: [],
    auditRows: [],
    durationMs: 0,
  };

  try {
    // 1) Upsert customer profile
    const customer = await createOrGetCustomerProfile(
      INSTRUCTOR_ID,
      persona.phone,
      persona.displayName,
      'manual'
    );
    result.customerId = customer.id;

    // 2) Resolve / create conversation
    const phone = normalizePhone(persona.phone);
    const conversation = await resolveConversationByChannel(
      'whatsapp',
      phone,
      INSTRUCTOR_ID
    );
    result.conversationId = conversation.id;

    // Link conversation to customer so inbox list shows display name (Alice, Sara, etc.)
    await linkConversationToCustomer(conversation.id, customer.id);

    // Clean slate: remove any existing messages/drafts for this demo conversation
    await clearConversationForDemo(conversation.id);

    // 3) Prerequisite: seed booking if scenario requires it
    if (sc.prerequisiteBooking) {
      const bp = sc.prerequisiteBooking;
      const seeded = await seedBookingForTest({
        instructorId: INSTRUCTOR_ID,
        customerId: customer.id,
        startTime: bp.startTime,
        endTime: bp.endTime,
        status: bp.status,
        notes: bp.notes,
        customerName: persona.displayName,
      });
      result.seededBookingId = seeded.id;
    }

    // 4) For each message in scenario
    for (let i = 0; i < sc.messages.length; i++) {
      const text = sc.messages[i];
      const extId = deterministicExternalId(sc.id, i);

      // 4a) Persist inbound message
      const msgId = await persistInboundMessageWithInboxBridge({
        conversationId: conversation.id,
        channel: 'whatsapp',
        externalMessageId: extId,
        senderIdentity: phone,
        messageText: text,
        receivedAt: new Date(),
        rawPayload: {
          seed_inbox: true,
          scenario_id: sc.id,
          run_ts: RUN_TS,
        },
      });
      result.messageIds.push(msgId);

      // 4b) Trigger AI classification + draft (fail-open)
      try {
        const orchResult = await orchestrateInboundDraft({
          conversationId: conversation.id,
          externalMessageId: extId,
          messageText: text,
          channel: 'whatsapp',
          language: sc.language,
          requestId: `seed_${RUN_TS}_${sc.id}_${i}`,
        });
        result.orchestratorResults.push(orchResult);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.orchestratorErrors.push(msg);
        result.orchestratorResults.push(null);
      }

      if (i < sc.messages.length - 1) await sleep(300);
    }

    // 5) Gather audit evidence
    await sleep(500);
    result.auditRows = await listConversationAuditSince(ts0, conversation.id);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    result.orchestratorErrors.push(`OUTER: ${msg}`);
  }

  result.durationMs = Date.now() - start;
  return result;
}

// ── Report generation ───────────────────────────────────────────────────────
function generateReport(results: ScenarioResult[]): string {
  const lines: string[] = [];

  lines.push('# Seed Inbox Customers — Report');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| Run | \`${RUN_TS}\` |`);
  lines.push(`| Instructor | \`${INSTRUCTOR_ID}\` |`);
  lines.push(`| Scenarios | ${results.length} |`);
  lines.push(`| Timestamp | ${new Date().toISOString()} |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Scenario | Label | Customer | Conversation | Prerequisite | Messages | Drafts | Reschedule Verified | Duration |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const drafts = r.orchestratorResults.filter((o) => o?.draftGenerated).length;
    const prereq = r.seededBookingId ? `booking \`${r.seededBookingId.slice(0, 8)}…\`` : '—';
    const rescheduleVerified = r.orchestratorResults.some((o) => o?.rescheduleVerified) ? 'YES' : '—';
    lines.push(
      `| ${r.scenario.id} | ${r.scenario.label} | \`${r.customerId.slice(0, 8)}…\` ` +
        `| \`${r.conversationId.slice(0, 8)}…\` | ${prereq} | ${r.messageIds.length} | ${drafts} ` +
        `| ${rescheduleVerified} | ${r.durationMs}ms |`
    );
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Per-scenario detail
  for (const r of results) {
    lines.push(`## ${r.scenario.id}: ${r.scenario.label}`);
    lines.push('');
    lines.push(`- **Customer:** ${r.persona.displayName} (${r.persona.phone})`);
    lines.push(`- **Customer ID:** \`${r.customerId}\``);
    lines.push(`- **Conversation ID:** \`${r.conversationId}\``);
    if (r.seededBookingId) {
      lines.push(`- **Prerequisite Booking ID:** \`${r.seededBookingId}\` (${r.scenario.prerequisiteBooking?.status})`);
    }
    lines.push('');

    lines.push('### Messages');
    lines.push('');
    for (let i = 0; i < r.scenario.messages.length; i++) {
      lines.push(`**Message ${i + 1}:**`);
      lines.push('```');
      lines.push(r.scenario.messages[i]);
      lines.push('```');
      lines.push(`- Message ID: \`${r.messageIds[i] ?? 'N/A'}\``);
      const orch = r.orchestratorResults[i];
      if (orch) {
        lines.push(`- Snapshot: \`${orch.snapshotId}\``);
        lines.push(`- Draft generated: **${orch.draftGenerated ? 'YES' : 'NO'}**`);
        if (orch.rescheduleVerified !== undefined) {
          lines.push(`- Reschedule verified: **${orch.rescheduleVerified ? 'YES' : 'NO'}**`);
        }
        if (orch.rescheduleBookingId) {
          lines.push(`- Reschedule booking ID: \`${orch.rescheduleBookingId}\``);
        }
        if (orch.customerContextUsed) {
          lines.push(`- Customer context used: **YES**`);
        }
        if (orch.detectedLanguage) {
          lines.push(`- Detected language: ${orch.detectedLanguage}`);
        }
        if (orch.confidenceBand) {
          lines.push(`- Confidence band: ${orch.confidenceBand}`);
        }
      } else {
        lines.push('- Orchestrator: **failed or skipped**');
      }
      lines.push('');
    }

    if (r.orchestratorErrors.length > 0) {
      lines.push('### Errors');
      for (const e of r.orchestratorErrors) {
        lines.push(`- ${e.slice(0, 200)}`);
      }
      lines.push('');
    }

    if (r.auditRows.length > 0) {
      lines.push('### Audit rows');
      lines.push('');
      const counts = new Map<string, number>();
      for (const a of r.auditRows) {
        const k = `${a.action}/${a.event_type ?? '-'}`;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      lines.push('| action | event_type | count |');
      lines.push('|---|---|---|');
      for (const [k, c] of counts) {
        const [action, et] = k.split('/');
        lines.push(`| ${action} | ${et} | ${c} |`);
      }
      lines.push('');

      // Show reschedule context audit event details if present
      const rescheduleAudit = r.auditRows.find(
        (a) => a.action === 'ai_reschedule_context_enriched'
      );
      if (rescheduleAudit?.payload) {
        lines.push('#### Reschedule Context Enrichment');
        lines.push('');
        lines.push('| Field | Value |');
        lines.push('|---|---|');
        for (const [k, v] of Object.entries(rescheduleAudit.payload)) {
          lines.push(`| ${k} | ${JSON.stringify(v)} |`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  // Verification SQL
  lines.push('## Verification SQL');
  lines.push('');
  lines.push('```sql');
  lines.push('-- Customer profiles seeded');
  lines.push(`SELECT id, phone_number, display_name, source FROM customer_profiles`);
  lines.push(`WHERE instructor_id = '${INSTRUCTOR_ID}'`);
  lines.push(`  AND phone_number IN (${PERSONAS.map((p) => `'${p.phone}'`).join(',')});`);
  lines.push('');
  lines.push('-- Conversations + message counts');
  lines.push(`SELECT c.id AS conversation_id, c.customer_identifier, count(m.id) AS msg_count`);
  lines.push(`FROM conversations c`);
  lines.push(`LEFT JOIN messages m ON m.conversation_id = c.id`);
  lines.push(`WHERE c.instructor_id = '${INSTRUCTOR_ID}'`);
  lines.push(`GROUP BY c.id, c.customer_identifier`);
  lines.push(`ORDER BY c.created_at DESC;`);
  lines.push('');
  lines.push('-- Seeded bookings');
  lines.push(`SELECT id, status, customer_name, start_time, end_time, notes FROM bookings`);
  lines.push(`WHERE instructor_id = '${INSTRUCTOR_ID}'`);
  lines.push(`  AND notes LIKE 'Seed:%'`);
  lines.push(`ORDER BY created_at DESC;`);
  lines.push('');
  lines.push('-- Latest AI drafts');
  lines.push(`SELECT ad.id, ad.state, ad.draft_text, ad.created_at, c.customer_identifier`);
  lines.push(`FROM ai_drafts ad`);
  lines.push(`JOIN conversations c ON c.id = ad.conversation_id`);
  lines.push(`WHERE ad.instructor_id = '${INSTRUCTOR_ID}'`);
  lines.push(`ORDER BY ad.created_at DESC LIMIT 10;`);
  lines.push('');
  lines.push('-- Reschedule context audit events');
  lines.push(`SELECT entity_id, action, payload, created_at FROM audit_log`);
  lines.push(`WHERE action = 'ai_reschedule_context_enriched'`);
  lines.push(`  AND request_id LIKE 'seed_${RUN_TS}%'`);
  lines.push(`ORDER BY created_at DESC;`);
  lines.push('```');
  lines.push('');
  lines.push(`_Generated by seed_inbox_customers.ts — run \`${RUN_TS}\`_`);
  lines.push('');

  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('=== FrostDesk Seed Inbox Customers ===');
  console.log(`Instructor: ${INSTRUCTOR_ID}`);
  console.log(`Run:        ${RUN_TS}`);
  console.log(`Scenarios:  ${SCENARIOS.length}`);
  console.log('');

  const results: ScenarioResult[] = [];

  for (const sc of SCENARIOS) {
    const persona = PERSONAS.find((p) => p.key === sc.personaKey)!;
    const prereqLabel = sc.prerequisiteBooking
      ? ` [prereq: ${sc.prerequisiteBooking.status} booking]`
      : '';
    console.log(`▶ ${sc.id} (${sc.label}) — ${persona.displayName}${prereqLabel} ...`);

    const result = await runScenario(sc);

    const drafts = result.orchestratorResults.filter((o) => o?.draftGenerated).length;
    const errs = result.orchestratorErrors.length;
    const reschedule = result.orchestratorResults.some((o) => o?.rescheduleVerified)
      ? ' [reschedule ✓]'
      : '';
    console.log(
      `  ✔ ${sc.id} done (${result.durationMs}ms): ` +
        `${result.messageIds.length} msg, ${drafts} drafts, ${result.auditRows.length} audit` +
        reschedule +
        (errs > 0 ? `, ⚠ ${errs} error(s)` : '')
    );

    results.push(result);
    await sleep(200);
  }

  // Write report
  const reportDir = path.join(REPO_ROOT, 'docs', 'sim_reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `seed_inbox_${RUN_TS}.md`);
  fs.writeFileSync(reportPath, generateReport(results), 'utf-8');

  console.log('');
  console.log(`📄 Report: ${path.relative(REPO_ROOT, reportPath)}`);
  console.log('');

  // Summary table
  console.log('Customer ID                          | Conversation ID                      | Phone            | Booking');
  console.log('-------------------------------------|--------------------------------------|------------------|---------');
  for (const r of results) {
    const booking = r.seededBookingId ? r.seededBookingId.slice(0, 8) + '…' : '—';
    console.log(`${r.customerId} | ${r.conversationId} | ${r.persona.phone.padEnd(16)} | ${booking}`);
  }

  console.log('');
  console.log('=== Seed complete ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});

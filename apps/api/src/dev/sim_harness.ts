#!/usr/bin/env tsx
/**
 * Conversation Simulation Harness — deterministic AI behavior tests.
 *
 * Runs 8 customer scenarios through the real inbound pipeline
 * (resolveConversationByChannel → persistInboundMessageWithInboxBridge → orchestrateInboundDraft)
 * and captures AI classification, draft output, reschedule context, and audit_log evidence.
 *
 * Scenarios with prerequisites (T3, T5, T7) seed a confirmed/completed booking
 * BEFORE sending the message, so the orchestrator can find the booking for
 * reschedule/cancellation context enrichment.
 *
 * Usage:
 *   SIM_INSTRUCTOR_ID=<uuid> pnpm -C apps/api exec tsx src/dev/sim_harness.ts
 *
 * Optional env:
 *   SIM_RUN_ID   — tag for the run (defaults to ISO timestamp).
 *
 * Output: docs/sim_reports/<SIM_RUN_ID>.md
 */

// ── Load env (same as API) ──────────────────────────────────────────────────
import '../loadEnv.js';

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  resolveConversationByChannel,
  persistInboundMessageWithInboxBridge,
  orchestrateInboundDraft,
  createOrGetCustomerProfile,
  listAuditSince,
  listBookingsSince,
  listConversationAuditSince,
  seedBookingForTest,
} from '@frostdesk/db';
import type {
  SimAuditRow,
  SimBookingRow,
  InboundDraftOrchestratorResult,
} from '@frostdesk/db';

import { isPilotInstructor } from '../lib/pilot_instructor.js';

// ── Resolve repo root for output path ───────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getRepoRoot } from '../getRepoRoot.js';
const REPO_ROOT = getRepoRoot(__dirname);

// ── Config ──────────────────────────────────────────────────────────────────
const _rawInstructorId = process.env.SIM_INSTRUCTOR_ID?.trim();
if (!_rawInstructorId || !/^[0-9a-fA-F-]{36}$/.test(_rawInstructorId)) {
  console.error(
    '❌  SIM_INSTRUCTOR_ID env var is required (UUID of an instructor_profiles row).\n' +
      'Example: SIM_INSTRUCTOR_ID=59a7c6d1-cfdc-40d6-b509-56d53c213477 pnpm -C apps/api exec tsx src/dev/sim_harness.ts'
  );
  process.exit(1);
}
const SIM_INSTRUCTOR_ID: string = _rawInstructorId;

const SIM_RUN_ID =
  process.env.SIM_RUN_ID?.trim() ||
  new Date().toISOString().replace(/[:.]/g, '-');

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

// ── Customer personas ───────────────────────────────────────────────────────
interface Persona {
  key: string;
  displayName: string;
  phone: string;
}

const PERSONAS: Persona[] = [
  { key: 'C1', displayName: 'Luca Rossi',    phone: '+41791234501' },
  { key: 'C2', displayName: 'Sara Johnson',  phone: '+44771234502' },
  { key: 'C3', displayName: 'Marco Bianchi', phone: '+39331234503' },
  { key: 'C4', displayName: 'Mamma Rosa',    phone: '+39339876504' },
  { key: 'C5', displayName: 'Elena Neri',    phone: '+39347111222' },
  { key: 'C6', displayName: 'Paolo Costa',   phone: '+41799876543' },
];

// ── Test cases ──────────────────────────────────────────────────────────────
interface PrerequisiteBooking {
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'completed';
  notes?: string;
}

interface TestCase {
  id: string;
  label: string;
  personaKey: string;
  messageText: string;
  language: string;
  expectsDraft: boolean;
  expectsBooking: boolean;
  expectsRescheduleVerified?: boolean;
  prerequisiteBooking?: PrerequisiteBooking;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'T1',
    label: 'info-prices',
    personaKey: 'C1',
    language: 'it',
    messageText: 'Quanto costa una lezione privata di sci di 2 ore?',
    expectsDraft: true,
    expectsBooking: false,
  },
  {
    id: 'T2',
    label: 'booking-complete',
    personaKey: 'C2',
    language: 'it',
    messageText: `Vorrei una lezione privata domani ${tomorrowDate()} dalle 10:00 alle 12:00, 2 adulti, Courchevel 1850. Mi chiamo Sara.`,
    expectsDraft: true,
    expectsBooking: false,
  },
  {
    id: 'T3',
    label: 'reschedule-verified',
    personaKey: 'C3',
    language: 'it',
    messageText: 'Possiamo spostare la lezione di domani da 09:00-11:00 a 11:00-13:00? Stesso punto di ritrovo.',
    expectsDraft: true,
    expectsBooking: false,
    expectsRescheduleVerified: true,
    prerequisiteBooking: {
      startTime: tomorrowAt(9, 0),
      endTime: tomorrowAt(11, 0),
      status: 'confirmed',
      notes: 'Sim: pre-existing booking for reschedule test',
    },
  },
  {
    id: 'T4',
    label: 'off-topic',
    personaKey: 'C4',
    language: 'it',
    messageText: 'Sai dove posso comprare del pane buono qui vicino?',
    expectsDraft: false,
    expectsBooking: false,
  },
  {
    id: 'T5',
    label: 'cancel-request',
    personaKey: 'C5',
    language: 'it',
    messageText: 'Devo cancellare la lezione di domani, mi sono fatta male al ginocchio.',
    expectsDraft: false, // CANCEL is not in OPERATIVE_INTENTS yet
    expectsBooking: false,
    prerequisiteBooking: {
      startTime: tomorrowAt(10, 0),
      endTime: tomorrowAt(12, 0),
      status: 'confirmed',
      notes: 'Sim: pre-existing booking for cancellation test',
    },
  },
  {
    id: 'T6',
    label: 'availability-check',
    personaKey: 'C6',
    language: 'it',
    messageText: 'Sei libero giovedì mattina per una lezione di sci?',
    expectsDraft: true,
    expectsBooking: false,
  },
  {
    id: 'T7',
    label: 'repeat-booking',
    personaKey: 'C2', // Sara (reuse for repeat context — she has completed booking)
    language: 'it',
    messageText: 'Vorrei prenotare come l\'ultima volta, stessi dettagli.',
    expectsDraft: true,
    expectsBooking: false,
    prerequisiteBooking: {
      startTime: daysAgo(7, 10, 0),
      endTime: daysAgo(7, 12, 0),
      status: 'completed',
      notes: 'Sim: completed booking for repeat-booking test. 2h private ski lesson.',
    },
  },
  {
    id: 'T8',
    label: 'ambiguity',
    personaKey: 'C3', // Marco (reuses conversation from T3)
    language: 'it',
    messageText: 'Pensandoci, forse meglio alle 14:00. Ma non sono sicuro, ti confermo domani.',
    expectsDraft: true,
    expectsBooking: false,
  },
];

// ── Per-test result ─────────────────────────────────────────────────────────
interface TestResult {
  testCase: TestCase;
  persona: Persona;
  ts0: string;
  conversationId: string | null;
  messageId: string | null;
  seededBookingId: string | null;
  orchestratorResult: InboundDraftOrchestratorResult | null;
  orchestratorError: string | null;
  pilotBlocked: boolean;
  auditRows: SimAuditRow[];
  bookingsCreated: SimBookingRow[];
  conversationAudit: SimAuditRow[];
  durationMs: number;
}

// ── Helper: fake WhatsApp external message id ──────────────────────────────
function fakeExternalId(testId: string): string {
  return `sim_${SIM_RUN_ID}_${testId}_${crypto.randomUUID().slice(0, 8)}`;
}

// ── Helper: sleep ───────────────────────────────────────────────────────────
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Run a single test case ──────────────────────────────────────────────────
async function runTestCase(tc: TestCase): Promise<TestResult> {
  const persona = PERSONAS.find((p) => p.key === tc.personaKey)!;
  const ts0 = new Date().toISOString();
  const start = Date.now();
  const externalMessageId = fakeExternalId(tc.id);

  const result: TestResult = {
    testCase: tc,
    persona,
    ts0,
    conversationId: null,
    messageId: null,
    seededBookingId: null,
    orchestratorResult: null,
    orchestratorError: null,
    pilotBlocked: false,
    auditRows: [],
    bookingsCreated: [],
    conversationAudit: [],
    durationMs: 0,
  };

  try {
    // 1) Ensure customer profile
    const customer = await createOrGetCustomerProfile(
      SIM_INSTRUCTOR_ID,
      persona.phone,
      persona.displayName,
      'sim_harness'
    );

    // 2) Resolve / create conversation
    const conversation = await resolveConversationByChannel(
      'whatsapp',
      persona.phone,
      SIM_INSTRUCTOR_ID
    );
    result.conversationId = conversation.id;

    // 3) Prerequisite: seed booking if test requires it
    if (tc.prerequisiteBooking) {
      const bp = tc.prerequisiteBooking;
      const seeded = await seedBookingForTest({
        instructorId: SIM_INSTRUCTOR_ID,
        customerId: customer.id,
        startTime: bp.startTime,
        endTime: bp.endTime,
        status: bp.status,
        notes: bp.notes,
        customerName: persona.displayName,
      });
      result.seededBookingId = seeded.id;
    }

    // 4) Check pilot gating
    result.pilotBlocked = !isPilotInstructor(SIM_INSTRUCTOR_ID);

    // 5) Persist inbound message (same as webhook)
    const messageId = await persistInboundMessageWithInboxBridge({
      conversationId: conversation.id,
      channel: 'whatsapp',
      externalMessageId,
      senderIdentity: persona.phone,
      messageText: tc.messageText,
      receivedAt: new Date(),
      rawPayload: {
        sim_harness: true,
        test_id: tc.id,
        run_id: SIM_RUN_ID,
      },
    });
    result.messageId = messageId;

    // 6) Orchestrate AI classification + draft (same as webhook)
    try {
      const orchResult = await orchestrateInboundDraft({
        conversationId: conversation.id,
        externalMessageId,
        messageText: tc.messageText,
        channel: 'whatsapp',
        language: tc.language,
        requestId: `sim_${SIM_RUN_ID}_${tc.id}`,
      });
      result.orchestratorResult = orchResult;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      result.orchestratorError = errMsg;
      if (errMsg.includes('402') || errMsg.toLowerCase().includes('pilot')) {
        result.pilotBlocked = true;
      }
    }

    // 7) Brief wait for async side-effects
    await sleep(500);

    // 8) Gather evidence
    result.auditRows = await listAuditSince(ts0);
    result.bookingsCreated = await listBookingsSince(ts0, SIM_INSTRUCTOR_ID);
    if (result.conversationId) {
      result.conversationAudit = await listConversationAuditSince(
        ts0,
        result.conversationId
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    result.orchestratorError = result.orchestratorError
      ? `${result.orchestratorError}; OUTER: ${msg}`
      : msg;
  }

  result.durationMs = Date.now() - start;
  return result;
}

// ── Assertion helpers ───────────────────────────────────────────────────────
function checkExpectation(label: string, expected: boolean, actual: boolean): string {
  const match = expected === actual;
  return match
    ? `  ✓ ${label}: expected=${expected}, actual=${actual}`
    : `  ✗ ${label}: expected=${expected}, actual=${actual} **MISMATCH**`;
}

// ── Report generation ───────────────────────────────────────────────────────
function generateReport(results: TestResult[]): string {
  const lines: string[] = [];
  const hr = '---';

  lines.push(`# Simulation Harness Report`);
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Run ID | \`${SIM_RUN_ID}\` |`);
  lines.push(`| Instructor ID | \`${SIM_INSTRUCTOR_ID}\` |`);
  lines.push(`| Pilot allowed | ${isPilotInstructor(SIM_INSTRUCTOR_ID) ? 'YES' : 'NO (402 expected on gated routes)'} |`);
  lines.push(`| Timestamp | ${new Date().toISOString()} |`);
  lines.push(`| Tests | ${results.length} |`);
  lines.push('');
  lines.push(hr);
  lines.push('');

  // Summary table
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Test | Label | Draft? | Booking? | Reschedule Verified | Prerequisite | Pilot | Duration |`);
  lines.push(`|---|---|---|---|---|---|---|---|`);
  for (const r of results) {
    const draft = r.orchestratorResult?.draftGenerated ? 'YES' : 'NO';
    const booking = r.bookingsCreated.length > 0 ? `YES (${r.bookingsCreated.length})` : 'NO';
    const reschedule = r.orchestratorResult?.rescheduleVerified ? 'YES' : '—';
    const prereq = r.seededBookingId ? `\`${r.seededBookingId.slice(0, 8)}…\`` : '—';
    const pilot = r.pilotBlocked ? '402' : 'OK';
    const dur = `${r.durationMs}ms`;
    lines.push(`| ${r.testCase.id} | ${r.testCase.label} | ${draft} | ${booking} | ${reschedule} | ${prereq} | ${pilot} | ${dur} |`);
  }
  lines.push('');

  // Expectations check
  lines.push(`## Expectations`);
  lines.push('');
  lines.push('```');
  let mismatches = 0;
  for (const r of results) {
    const tc = r.testCase;
    lines.push(`${tc.id} (${tc.label}):`);
    const draftActual = r.orchestratorResult?.draftGenerated ?? false;
    const draftLine = checkExpectation('draftGenerated', tc.expectsDraft, draftActual);
    if (tc.expectsDraft !== draftActual) mismatches++;
    lines.push(draftLine);

    const bookingActual = r.bookingsCreated.length > 0;
    const bookingLine = checkExpectation('bookingCreated', tc.expectsBooking, bookingActual);
    if (tc.expectsBooking !== bookingActual) mismatches++;
    lines.push(bookingLine);

    if (tc.expectsRescheduleVerified !== undefined) {
      const rescheduleActual = r.orchestratorResult?.rescheduleVerified ?? false;
      const rescheduleLine = checkExpectation('rescheduleVerified', tc.expectsRescheduleVerified, rescheduleActual);
      if (tc.expectsRescheduleVerified !== rescheduleActual) mismatches++;
      lines.push(rescheduleLine);
    }

    lines.push('');
  }
  lines.push(`Total mismatches: ${mismatches}`);
  lines.push('```');
  lines.push('');
  lines.push(hr);
  lines.push('');

  // Per-test detail
  for (const r of results) {
    lines.push(`## ${r.testCase.id}: ${r.testCase.label}`);
    lines.push('');

    lines.push(`### Customer`);
    lines.push(`- Name: ${r.persona.displayName}`);
    lines.push(`- Phone: ${r.persona.phone}`);
    lines.push(`- Key: ${r.persona.key}`);
    if (r.seededBookingId) {
      lines.push(`- Prerequisite Booking: \`${r.seededBookingId}\` (${r.testCase.prerequisiteBooking?.status})`);
    }
    lines.push('');

    lines.push(`### Input message`);
    lines.push('');
    lines.push('```');
    lines.push(r.testCase.messageText);
    lines.push('```');
    lines.push('');

    lines.push(`### Pipeline output`);
    lines.push(`- Conversation ID: \`${r.conversationId ?? 'N/A'}\``);
    lines.push(`- Message ID: \`${r.messageId ?? 'N/A'}\``);
    if (r.orchestratorResult) {
      lines.push(`- Snapshot ID: \`${r.orchestratorResult.snapshotId}\``);
      lines.push(`- Draft generated: **${r.orchestratorResult.draftGenerated ? 'YES' : 'NO'}**`);
      if (r.orchestratorResult.confidenceBand) {
        lines.push(`- Confidence band: ${r.orchestratorResult.confidenceBand}`);
      }
      if (r.orchestratorResult.detectedLanguage) {
        lines.push(`- Detected language: ${r.orchestratorResult.detectedLanguage}`);
      }
      if (r.orchestratorResult.customerContextUsed) {
        lines.push(`- Customer context used: **YES**`);
      }
      if (r.orchestratorResult.rescheduleVerified !== undefined) {
        lines.push(`- Reschedule verified: **${r.orchestratorResult.rescheduleVerified ? 'YES' : 'NO'}**`);
      }
      if (r.orchestratorResult.rescheduleBookingId) {
        lines.push(`- Reschedule booking ID: \`${r.orchestratorResult.rescheduleBookingId}\``);
      }
      if (r.orchestratorResult.summaryUsed) {
        lines.push(`- Summary used: **YES**`);
      }
    }
    if (r.orchestratorError) {
      lines.push(`- **Orchestrator error:** ${r.orchestratorError}`);
    }
    lines.push('');

    lines.push(`### Pilot gating`);
    lines.push(
      r.pilotBlocked
        ? '- **Blocked (402 PILOT_ONLY)** — instructor is not in PILOT_INSTRUCTOR_IDS allowlist.'
        : '- Allowed — instructor is in pilot allowlist.'
    );
    lines.push('');

    // Bookings
    lines.push(`### Bookings created/changed`);
    if (r.bookingsCreated.length === 0) {
      lines.push('- None');
    } else {
      for (const b of r.bookingsCreated) {
        lines.push(
          `- \`${b.id}\` status=\`${b.status}\` start=\`${b.start_time}\` end=\`${b.end_time}\` customer=\`${b.customer_name}\``
        );
      }
    }
    lines.push('');

    // Audit
    lines.push(`### Audit log rows (since test start)`);
    if (r.conversationAudit.length > 0) {
      lines.push('');
      lines.push(`#### Conversation-scoped`);
      const actionCounts = new Map<string, number>();
      for (const a of r.conversationAudit) {
        const key = `${a.action}/${a.event_type ?? '-'}`;
        actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1);
      }
      lines.push('| action | event_type | count |');
      lines.push('|---|---|---|');
      for (const [key, count] of actionCounts) {
        const [action, et] = key.split('/');
        lines.push(`| ${action} | ${et} | ${count} |`);
      }
      lines.push('');

      // Reschedule context audit detail
      const rescheduleAudit = r.conversationAudit.find(
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
    if (r.auditRows.length > 0) {
      lines.push('');
      lines.push(`#### All audit rows in window`);
      const actionCounts = new Map<string, number>();
      for (const a of r.auditRows) {
        const key = `${a.action}/${a.event_type ?? '-'}`;
        actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1);
      }
      lines.push('| action | event_type | count |');
      lines.push('|---|---|---|');
      for (const [key, count] of actionCounts) {
        const [action, et] = key.split('/');
        lines.push(`| ${action} | ${et} | ${count} |`);
      }
    } else {
      lines.push('- No audit rows captured.');
    }
    lines.push('');
    lines.push(hr);
    lines.push('');
  }

  // Footer
  lines.push('## Verification SQL');
  lines.push('');
  lines.push('```sql');
  lines.push('-- Seeded prerequisite bookings');
  lines.push(`SELECT id, status, customer_name, start_time, end_time, notes FROM bookings`);
  lines.push(`WHERE instructor_id = '${SIM_INSTRUCTOR_ID}'`);
  lines.push(`  AND notes LIKE 'Sim:%'`);
  lines.push(`ORDER BY created_at DESC;`);
  lines.push('');
  lines.push('-- AI drafts from this run');
  lines.push(`SELECT ad.id, ad.state, ad.draft_text, ad.created_at`);
  lines.push(`FROM ai_drafts ad`);
  lines.push(`WHERE ad.instructor_id = '${SIM_INSTRUCTOR_ID}'`);
  lines.push(`ORDER BY ad.created_at DESC LIMIT 10;`);
  lines.push('');
  lines.push('-- Reschedule context audit events');
  lines.push(`SELECT entity_id, action, payload, created_at FROM audit_log`);
  lines.push(`WHERE action = 'ai_reschedule_context_enriched'`);
  lines.push(`  AND request_id LIKE 'sim_${SIM_RUN_ID}%'`);
  lines.push(`ORDER BY created_at DESC;`);
  lines.push('');
  lines.push('-- Audit event_type / action alignment');
  lines.push('SELECT event_type, action, count(*)');
  lines.push('FROM audit_log');
  lines.push('GROUP BY 1, 2');
  lines.push('ORDER BY count DESC;');
  lines.push('```');
  lines.push('');
  lines.push(`_Generated by sim_harness.ts — run \`${SIM_RUN_ID}\`_`);
  lines.push('');

  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('=== FrostDesk Conversation Simulation Harness ===');
  console.log(`Run ID:        ${SIM_RUN_ID}`);
  console.log(`Instructor ID: ${SIM_INSTRUCTOR_ID}`);
  console.log(`Pilot allowed: ${isPilotInstructor(SIM_INSTRUCTOR_ID)}`);
  console.log(`Test cases:    ${TEST_CASES.length}`);
  console.log('');

  const results: TestResult[] = [];
  let totalMismatches = 0;

  for (const tc of TEST_CASES) {
    const persona = PERSONAS.find((p) => p.key === tc.personaKey)!;
    const prereqLabel = tc.prerequisiteBooking
      ? ` [prereq: ${tc.prerequisiteBooking.status}]`
      : '';
    console.log(`▶ Running ${tc.id} (${tc.label})${prereqLabel} ...`);
    const result = await runTestCase(tc);

    const draftFlag = result.orchestratorResult?.draftGenerated ? '✓ draft' : '✗ no draft';
    const bookingFlag =
      result.bookingsCreated.length > 0
        ? `✓ ${result.bookingsCreated.length} booking(s)`
        : '✗ no bookings';
    const rescheduleFlag = result.orchestratorResult?.rescheduleVerified
      ? ' [reschedule ✓]'
      : '';
    const auditFlag = `${result.conversationAudit.length} audit rows`;
    const pilotFlag = result.pilotBlocked ? '⚠ 402 PILOT_ONLY' : '';
    const errFlag = result.orchestratorError ? `⚠ err: ${result.orchestratorError.slice(0, 80)}` : '';

    // Check expectations
    const draftActual = result.orchestratorResult?.draftGenerated ?? false;
    const bookingActual = result.bookingsCreated.length > 0;
    let mismatches = 0;
    if (tc.expectsDraft !== draftActual) mismatches++;
    if (tc.expectsBooking !== bookingActual) mismatches++;
    if (tc.expectsRescheduleVerified !== undefined) {
      const rescheduleActual = result.orchestratorResult?.rescheduleVerified ?? false;
      if (tc.expectsRescheduleVerified !== rescheduleActual) mismatches++;
    }
    totalMismatches += mismatches;
    const mismatchFlag = mismatches > 0 ? ` ⚠ ${mismatches} mismatch(es)` : '';

    console.log(
      `  ✔ ${tc.id} done (${result.durationMs}ms): ${draftFlag} | ${bookingFlag} | ${auditFlag}${rescheduleFlag} ${pilotFlag} ${errFlag}${mismatchFlag}`
    );

    results.push(result);
    await sleep(200);
  }

  // Write report
  const reportDir = path.join(REPO_ROOT, 'docs', 'sim_reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, `${SIM_RUN_ID}.md`);
  const report = generateReport(results);
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log('');
  console.log(`📄 Report written to: ${path.relative(REPO_ROOT, reportPath)}`);
  if (totalMismatches > 0) {
    console.log(`⚠  Total expectation mismatches: ${totalMismatches}`);
  } else {
    console.log(`✅ All expectations met.`);
  }
  console.log('');
  console.log('=== Simulation complete ===');

  process.exit(totalMismatches > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Simulation harness fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Conversation Simulation Harness — deterministic AI behavior tests.
 *
 * Runs 4 customer personas through the real inbound pipeline
 * (resolveConversationByChannel → persistInboundMessageWithInboxBridge → orchestrateInboundDraft)
 * and captures AI classification, draft output, booking mutations, and audit_log evidence.
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
} from '@frostdesk/db';
import type {
  SimAuditRow,
  SimBookingRow,
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

// ── Customer personas ───────────────────────────────────────────────────────
interface Persona {
  key: string;
  displayName: string;
  phone: string;
}

const PERSONAS: Persona[] = [
  { key: 'C1', displayName: 'Luca Rossi',   phone: '+41791234501' },
  { key: 'C2', displayName: 'Sara Johnson', phone: '+44771234502' },
  { key: 'C3', displayName: 'Marco Bianchi', phone: '+39331234503' },
  { key: 'C4', displayName: 'Mamma Rosa',   phone: '+39339876504' },
];

// ── Test cases ──────────────────────────────────────────────────────────────
interface TestCase {
  id: string;
  label: string;
  personaKey: string;
  messageText: string;
  expectsDraft: boolean;
  expectsBooking: boolean;
}

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

const TEST_CASES: TestCase[] = [
  {
    id: 'T1',
    label: 'info-only',
    personaKey: 'C1',
    messageText: 'Ciao, quali sono i prezzi delle lezioni di sci? Avete pacchetti per principianti?',
    expectsDraft: true,
    expectsBooking: false,
  },
  {
    id: 'T2',
    label: 'booking-complete',
    personaKey: 'C2',
    messageText: `Hi, I would like to book a ski lesson for tomorrow ${tomorrowDate()} from 10:00 to 12:00 for 2 adults. My name is Sara Johnson.`,
    expectsDraft: true,
    expectsBooking: true,
  },
  {
    id: 'T3',
    label: 'ambiguity',
    personaKey: 'C3',
    messageText: 'Vorrei prenotare una lezione, forse domani o dopodomani, non sono sicuro. Siamo in due o tre, devo confermare.',
    expectsDraft: true,
    expectsBooking: false,
  },
  {
    id: 'T4',
    label: 'off-topic',
    personaKey: 'C4',
    messageText: 'Sai dove posso comprare del pane buono qui vicino?',
    expectsDraft: false,
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
  orchestratorResult: { snapshotId: string; draftGenerated: boolean } | null;
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
    orchestratorResult: null,
    orchestratorError: null,
    pilotBlocked: false,
    auditRows: [],
    bookingsCreated: [],
    conversationAudit: [],
    durationMs: 0,
  };

  try {
    // 1) Ensure customer profile ('sim_harness' allowed by migration 20260214180000)
    await createOrGetCustomerProfile(
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

    // 3) Check pilot gating before mutation-heavy steps
    result.pilotBlocked = !isPilotInstructor(SIM_INSTRUCTOR_ID);

    // 4) Persist inbound message (same as webhook)
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

    // 5) Orchestrate AI classification + draft (same as webhook)
    try {
      const orchResult = await orchestrateInboundDraft({
        conversationId: conversation.id,
        externalMessageId,
        messageText: tc.messageText,
        channel: 'whatsapp',
        language: 'it',
        requestId: `sim_${SIM_RUN_ID}_${tc.id}`,
      });
      result.orchestratorResult = orchResult;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      result.orchestratorError = errMsg;
      // check for pilot gating in error
      if (errMsg.includes('402') || errMsg.toLowerCase().includes('pilot')) {
        result.pilotBlocked = true;
      }
    }

    // 6) Brief wait for async side-effects (audit writes, etc.)
    await sleep(500);

    // 7) Gather evidence
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
  lines.push(`| Test | Label | Draft? | Booking? | Audit rows | Pilot blocked | Duration |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const r of results) {
    const draft = r.orchestratorResult?.draftGenerated ? 'YES' : 'NO';
    const booking = r.bookingsCreated.length > 0 ? `YES (${r.bookingsCreated.length})` : 'NO';
    const audit = r.auditRows.length.toString();
    const pilot = r.pilotBlocked ? '402 PILOT_ONLY' : 'OK';
    const dur = `${r.durationMs}ms`;
    lines.push(`| ${r.testCase.id} | ${r.testCase.label} | ${draft} | ${booking} | ${audit} | ${pilot} | ${dur} |`);
  }
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

  for (const tc of TEST_CASES) {
    console.log(`▶ Running ${tc.id} (${tc.label}) ...`);
    const result = await runTestCase(tc);

    const draftFlag = result.orchestratorResult?.draftGenerated ? '✓ draft' : '✗ no draft';
    const bookingFlag =
      result.bookingsCreated.length > 0
        ? `✓ ${result.bookingsCreated.length} booking(s)`
        : '✗ no bookings';
    const auditFlag = `${result.conversationAudit.length} audit rows`;
    const pilotFlag = result.pilotBlocked ? '⚠ 402 PILOT_ONLY' : '';
    const errFlag = result.orchestratorError ? `⚠ err: ${result.orchestratorError.slice(0, 80)}` : '';

    console.log(
      `  ✔ ${tc.id} done (${result.durationMs}ms): ${draftFlag} | ${bookingFlag} | ${auditFlag} ${pilotFlag} ${errFlag}`
    );

    results.push(result);

    // Small gap between tests so timestamps don't overlap
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
  console.log('');
  console.log('=== Simulation complete ===');

  // exit cleanly (DB pool may keep process alive)
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Simulation harness fatal error:', err);
  process.exit(1);
});

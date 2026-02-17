#!/usr/bin/env tsx
/**
 * Seed Inbox Customers — populates 4 customers + realistic inbound messages
 * so the Instructor Inbox has data to render.
 *
 * Uses the same production pipeline as the WhatsApp webhook:
 *   resolveConversationByChannel → persistInboundMessageWithInboxBridge → orchestrateInboundDraft
 *
 * Usage (from repo root):
 *   SEED_INSTRUCTOR_ID=<uuid> pnpm -C apps/api exec tsx src/dev/seed_inbox_customers.ts
 *
 * Output: docs/sim_reports/seed_inbox_<timestamp>.md
 */

// ── Load env (same as API) ──────────────────────────────────────────────────
import '../loadEnv.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  resolveConversationByChannel,
  persistInboundMessageWithInboxBridge,
  orchestrateInboundDraft,
  createOrGetCustomerProfile,
  normalizePhone,
  listAuditSince,
  listConversationAuditSince,
} from '@frostdesk/db';
import type { SimAuditRow } from '@frostdesk/db';

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

// ── Personas ────────────────────────────────────────────────────────────────
interface Persona {
  key: string;
  displayName: string;
  phone: string;
}

const PERSONAS: Persona[] = [
  { key: 'A', displayName: 'Luca Rossi',    phone: '+41791234501' },
  { key: 'B', displayName: 'Sara Johnson',  phone: '+44771234502' },
  { key: 'C', displayName: 'Marco Bianchi', phone: '+39331234503' },
  { key: 'D', displayName: 'Mamma Rosa',    phone: '+39339876504' },
];

// ── Scenarios ───────────────────────────────────────────────────────────────
interface Scenario {
  id: string;
  label: string;
  personaKey: string;
  messages: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: 'A',
    label: 'info-only',
    personaKey: 'A',
    messages: [
      'Hi! Do you do private lessons in Courchevel next week? What are your rates and meeting points?',
    ],
  },
  {
    id: 'B',
    label: 'booking-complete',
    personaKey: 'B',
    messages: [
      "Hello, I'd like a private ski lesson on 2026-02-18 from 10:00 to 12:00 for 2 adults in Zermatt. Meeting point at Sunnegga if possible.",
    ],
  },
  {
    id: 'C',
    label: 'booking-change',
    personaKey: 'C',
    messages: [
      "Can we move my lesson tomorrow from 09:00-11:00 to 11:00-13:00? Same meeting point.",
    ],
  },
  {
    id: 'D',
    label: 'off-topic',
    personaKey: 'D',
    messages: [
      "Hi dear, don't forget to call your grandma tonight. Love you.",
    ],
  },
];

// ── Per-scenario result ─────────────────────────────────────────────────────
interface ScenarioResult {
  scenario: Scenario;
  persona: Persona;
  customerId: string;
  conversationId: string;
  messageIds: string[];
  orchestratorResults: Array<{
    snapshotId: string;
    draftGenerated: boolean;
  } | null>;
  orchestratorErrors: string[];
  auditRows: SimAuditRow[];
  durationMs: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Deterministic external message ID so re-running the seed is idempotent.
 * persistInboundMessageWithInboxBridge checks (channel, external_message_id)
 * and returns the existing row if found — no duplicate inserts.
 */
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
    messageIds: [],
    orchestratorResults: [],
    orchestratorErrors: [],
    auditRows: [],
    durationMs: 0,
  };

  try {
    // 1) Upsert customer profile (source='manual' — universally safe)
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

    // 3) For each message in scenario
    for (let i = 0; i < sc.messages.length; i++) {
      const text = sc.messages[i];
      const extId = deterministicExternalId(sc.id, i);

      // 3a) Persist inbound message
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

      // 3b) Trigger AI classification + draft (fail-open)
      try {
        const orchResult = await orchestrateInboundDraft({
          conversationId: conversation.id,
          externalMessageId: extId,
          messageText: text,
          channel: 'whatsapp',
          language: 'it',
          requestId: `seed_${RUN_TS}_${sc.id}_${i}`,
        });
        result.orchestratorResults.push(orchResult);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.orchestratorErrors.push(msg);
        result.orchestratorResults.push(null);
      }

      // Small gap between messages
      if (i < sc.messages.length - 1) await sleep(300);
    }

    // 4) Gather audit evidence
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
  lines.push('| Scenario | Label | Customer | Conversation | Messages | Drafts | Audit | Duration |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const drafts = r.orchestratorResults.filter((o) => o?.draftGenerated).length;
    lines.push(
      `| ${r.scenario.id} | ${r.scenario.label} | \`${r.customerId.slice(0, 8)}…\` ` +
        `| \`${r.conversationId.slice(0, 8)}…\` | ${r.messageIds.length} | ${drafts} ` +
        `| ${r.auditRows.length} | ${r.durationMs}ms |`
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
  lines.push(`  AND phone_number IN ('+41791234501','+44771234502','+39331234503','+39339876504');`);
  lines.push('');
  lines.push('-- Conversations + message counts');
  lines.push(`SELECT c.id AS conversation_id, c.customer_identifier, count(m.id) AS msg_count`);
  lines.push(`FROM conversations c`);
  lines.push(`LEFT JOIN messages m ON m.conversation_id = c.id`);
  lines.push(`WHERE c.instructor_id = '${INSTRUCTOR_ID}'`);
  lines.push(`GROUP BY c.id, c.customer_identifier`);
  lines.push(`ORDER BY c.created_at DESC;`);
  lines.push('');
  lines.push('-- Latest audit rows for these conversations');
  lines.push(`SELECT al.entity_id, al.action, al.event_type, al.created_at`);
  lines.push(`FROM audit_log al`);
  lines.push(`WHERE al.entity_type = 'conversation'`);
  lines.push(`  AND al.request_id LIKE 'seed_${RUN_TS}%'`);
  lines.push(`ORDER BY al.created_at DESC LIMIT 20;`);
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
    console.log(`▶ ${sc.id} (${sc.label}) — ${persona.displayName} ...`);

    const result = await runScenario(sc);

    const drafts = result.orchestratorResults.filter((o) => o?.draftGenerated).length;
    const errs = result.orchestratorErrors.length;
    console.log(
      `  ✔ ${sc.id} done (${result.durationMs}ms): ` +
        `${result.messageIds.length} msg, ${drafts} drafts, ${result.auditRows.length} audit` +
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
  console.log('Customer ID                          | Conversation ID                      | Phone');
  console.log('-------------------------------------|--------------------------------------|----------------');
  for (const r of results) {
    console.log(`${r.customerId} | ${r.conversationId} | ${r.persona.phone}`);
  }

  console.log('');
  console.log('=== Seed complete ===');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});

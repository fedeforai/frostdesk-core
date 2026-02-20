import ExcelJS from 'exceljs';
import type { ComprehensiveDashboard } from '@frostdesk/db';

/**
 * Builds a Daily Snapshot Excel workbook from ComprehensiveDashboard data.
 * Pure function: no DB access, no side-effects.
 *
 * @param data - ComprehensiveDashboard snapshot
 * @param env  - Environment label (e.g. "production", "staging")
 * @returns Buffer containing the .xlsx file
 */
export async function buildDailyReport(
  data: ComprehensiveDashboard,
  env: string = 'unknown',
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FrostDesk Admin';
  wb.created = new Date();

  const ws = wb.addWorksheet('Daily Snapshot');

  // ── Column widths ───────────────────────────────────────────────
  ws.columns = [
    { key: 'metric', width: 38 },
    { key: 'value', width: 22 },
    { key: 'notes', width: 40 },
  ];

  // ── Style helpers ───────────────────────────────────────────────
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
    size: 11,
  };
  const sectionFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8EEF4' },
  };
  const sectionFont: Partial<ExcelJS.Font> = {
    bold: true,
    size: 11,
    color: { argb: 'FF1E3A5F' },
  };

  function addHeader() {
    const row = ws.addRow(['Metric', 'Value', 'Notes']);
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle' };
    });
  }

  function addSection(title: string) {
    const row = ws.addRow([title, '', '']);
    ws.mergeCells(row.number, 1, row.number, 3);
    row.getCell(1).fill = sectionFill;
    row.getCell(1).font = sectionFont;
    row.getCell(1).alignment = { vertical: 'middle' };
  }

  function addRow(metric: string, value: string | number | boolean | null, notes = '') {
    const display = value === null || value === undefined ? '—' : String(value);
    ws.addRow([metric, display, notes]);
  }

  // ── Title row ───────────────────────────────────────────────────
  const titleRow = ws.addRow(['FrostDesk — Daily Report']);
  ws.mergeCells(titleRow.number, 1, titleRow.number, 3);
  titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  ws.addRow([]);

  addHeader();

  // ── System Health ──────────────────────────────────────────────
  addSection('System Health');
  addRow('AI Global Enabled', data.system.ai_global_enabled);
  addRow('AI WhatsApp Enabled', data.system.ai_whatsapp_enabled);
  addRow('Emergency Disabled', data.system.emergency_disabled);
  addRow('Pilot Instructors', data.system.pilot_instructor_count, `max: ${data.system.pilot_max}`);
  addRow('WhatsApp Quota Limit', data.system.quota.limit);
  addRow('WhatsApp Quota Used Today', data.system.quota.used_today);
  addRow('WhatsApp Quota %', data.system.quota.percentage !== null ? `${data.system.quota.percentage}%` : '—');
  addRow('Quota Status', data.system.quota.status);
  addRow('Webhook Inbound (24h)', data.health_24h.webhook_inbound);
  addRow('Webhook Errors (24h)', data.health_24h.webhook_errors);
  addRow('Webhook Last Error', data.health_24h.webhook_last_error_at);
  addRow('AI Draft Errors (24h)', data.health_24h.ai_draft_errors);
  addRow('Quota Exceeded Events (24h)', data.health_24h.quota_exceeded);
  addRow('Escalations (24h)', data.health_24h.escalations);

  // ── Today Metrics ──────────────────────────────────────────────
  addSection('Today Metrics');
  addRow('New Conversations', data.today.conversations_new);
  addRow('Open Conversations', data.today.conversations_open);
  addRow('Inbound Messages', data.today.messages_inbound);
  addRow('Outbound Messages', data.today.messages_outbound);
  addRow('Bookings Created', data.today.bookings_created);
  addRow('Bookings Cancelled', data.today.bookings_cancelled);
  addRow('Customer Notes Added', data.today.customer_notes_added);
  addRow('Human Overrides', data.today.human_overrides);

  // ── Yesterday Comparison ───────────────────────────────────────
  addSection('Yesterday Comparison');
  addRow('Open Conversations (yesterday)', data.yesterday.conversations_open);
  addRow('Escalations (yesterday)', data.yesterday.escalations);
  addRow('Draft Approval Rate (yesterday)', data.yesterday.draft_approval_rate !== null ? `${data.yesterday.draft_approval_rate}%` : '—');
  addRow('Draft Errors (yesterday)', data.yesterday.draft_errors);
  addRow('Bookings Created (yesterday)', data.yesterday.bookings_created);
  addRow('Instructors Online (yesterday)', data.yesterday.instructors_online);

  // ── AI Performance ─────────────────────────────────────────────
  addSection('AI Performance');
  addRow('Drafts Generated Today', data.ai.drafts_generated_today);
  addRow('Drafts Sent Today', data.ai.drafts_sent_today);
  addRow('Drafts Pending', data.ai.drafts_pending);
  addRow('Draft Approval Rate', data.ai.draft_approval_rate !== null ? `${data.ai.draft_approval_rate}%` : '—');
  addRow('Draft Errors Today', data.ai.draft_errors_today);
  addRow('Escalations Today', data.ai.escalations_today);
  addRow('AI-Eligible Conversations Today', data.ai.conversations_ai_eligible_today);
  addRow('Avg Latency (7d)', `${data.ai.avg_latency_ms_7d} ms`);
  addRow('Total Cost (7d)', `${(data.ai.total_cost_cents_7d / 100).toFixed(2)} €`, 'cents / 100');
  addRow('Total API Calls (7d)', data.ai.total_calls_7d);
  addRow('Error Rate (7d)', `${data.ai.error_rate_7d}%`);

  // ── AI Adoption ────────────────────────────────────────────────
  const adoption = data.ai_adoption ?? {
    toggles_on_today: 0,
    toggles_off_today: 0,
    toggles_7d_total: 0,
    toggles_grouped_by_instructor_7d: [],
  };
  addSection('AI Adoption');
  addRow('Toggles ON today', adoption.toggles_on_today);
  addRow('Toggles OFF today', adoption.toggles_off_today);
  addRow('Toggles 7d total', adoption.toggles_7d_total);
  if (adoption.toggles_grouped_by_instructor_7d.length > 0) {
    addSection('Top togglers (7d)');
    for (const row of adoption.toggles_grouped_by_instructor_7d) {
      addRow(`  ${row.instructor_id}`, row.toggles);
    }
  }

  // ── Instructors ────────────────────────────────────────────────
  addSection('Instructors');
  addRow('Total Profiles', data.instructors.total_profiles);
  addRow('Onboarded (approved)', data.instructors.onboarded_profiles);
  addRow('Active (7d)', data.instructors.active_7d);
  addRow('Pilot Count', data.instructors.pilot_count);
  addRow('Online Now', data.presence.online_now);
  addRow('Active Last 30m', data.presence.last_30m);
  addRow('Offline', data.presence.offline);
  addRow('Logins Today', data.user_access.logins_today);
  addRow('Unique Users Today', data.user_access.unique_users_today);
  addRow('Active Sessions', data.user_access.active_sessions);

  // ── Bookings ───────────────────────────────────────────────────
  addSection('Bookings');
  addRow('Total Bookings (all time)', data.instructors.total_bookings);
  addRow('Active Bookings', data.instructors.active_bookings);
  addRow('Created (7d)', data.instructors.bookings_created_7d);
  addRow('Customer Notes (7d)', data.instructors.customer_notes_7d);
  for (const bs of data.instructors.bookings_by_status) {
    addRow(`  Status: ${bs.status}`, bs.count);
  }

  // ── Recent Audit Events ────────────────────────────────────────
  if (data.recent_events.length > 0) {
    addSection('Recent Audit Events (last 15)');
    for (const ev of data.recent_events) {
      addRow(
        ev.action,
        ev.severity,
        `${ev.actor_type}${ev.actor_id ? ` (${ev.actor_id.slice(0, 8)}…)` : ''} → ${ev.entity_type ?? ''}${ev.entity_id ? ` ${ev.entity_id.slice(0, 8)}…` : ''} @ ${ev.created_at}`,
      );
    }
  }

  // ── Footer ─────────────────────────────────────────────────────
  ws.addRow([]);
  addSection('Report Metadata');
  addRow('Generated At', data.generated_at);
  addRow('Environment', env);

  // Auto-filter on the header row (row 3)
  ws.autoFilter = { from: 'A3', to: 'C3' };

  // Freeze top rows
  ws.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

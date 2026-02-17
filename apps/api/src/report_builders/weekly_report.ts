import ExcelJS from 'exceljs';
import type { ComprehensiveDashboard } from '@frostdesk/db';

/**
 * Builds a Weekly Summary Excel workbook from ComprehensiveDashboard data.
 * Uses only fields already available — marks unavailable metrics as N/A.
 *
 * Sheets:
 *   1. Weekly Summary  — high-level KPIs
 *   2. AI 7d           — AI performance over the last 7 days
 *   3. Bookings 7d     — booking metrics
 *   4. Conversations 7d — conversation metrics (partial, rest N/A)
 */
export async function buildWeeklyReport(
  data: ComprehensiveDashboard,
  env: string = 'unknown',
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'FrostDesk Admin';
  wb.created = new Date();

  // ── Style helpers ───────────────────────────────────────────────
  const headerFill: ExcelJS.Fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    bold: true, color: { argb: 'FFFFFFFF' }, size: 11,
  };
  const sectionFill: ExcelJS.Fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF4' },
  };
  const sectionFont: Partial<ExcelJS.Font> = {
    bold: true, size: 11, color: { argb: 'FF1E3A5F' },
  };

  function setupSheet(ws: ExcelJS.Worksheet) {
    ws.columns = [
      { key: 'metric', width: 40 },
      { key: 'value', width: 22 },
      { key: 'notes', width: 44 },
    ];
  }

  function addTitle(ws: ExcelJS.Worksheet, title: string) {
    const row = ws.addRow([title]);
    ws.mergeCells(row.number, 1, row.number, 3);
    row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
    row.getCell(1).alignment = { horizontal: 'center' };
    ws.addRow([]);
  }

  function addHeader(ws: ExcelJS.Worksheet) {
    const row = ws.addRow(['Metric', 'Value', 'Notes']);
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle' };
    });
  }

  function addSection(ws: ExcelJS.Worksheet, title: string) {
    const row = ws.addRow([title, '', '']);
    ws.mergeCells(row.number, 1, row.number, 3);
    row.getCell(1).fill = sectionFill;
    row.getCell(1).font = sectionFont;
  }

  function addRow(ws: ExcelJS.Worksheet, metric: string, value: string | number | boolean | null, notes = '') {
    const display = value === null || value === undefined ? 'N/A' : String(value);
    ws.addRow([metric, display, notes]);
  }

  function addFooter(ws: ExcelJS.Worksheet) {
    ws.addRow([]);
    addSection(ws, 'Report Metadata');
    addRow(ws, 'Generated At', data.generated_at);
    addRow(ws, 'Environment', env);
    addRow(ws, 'Report Type', 'Weekly');
  }

  // ════════════════════════════════════════════════════════════════
  // Sheet 1: Weekly Summary
  // ════════════════════════════════════════════════════════════════
  const wsSummary = wb.addWorksheet('Weekly Summary');
  setupSheet(wsSummary);
  addTitle(wsSummary, 'FrostDesk — Weekly Report');
  addHeader(wsSummary);

  addSection(wsSummary, 'System Status');
  addRow(wsSummary, 'AI Global Enabled', data.system.ai_global_enabled);
  addRow(wsSummary, 'AI WhatsApp Enabled', data.system.ai_whatsapp_enabled);
  addRow(wsSummary, 'Emergency Disabled', data.system.emergency_disabled);
  addRow(wsSummary, 'Pilot Instructors', data.system.pilot_instructor_count, `max: ${data.system.pilot_max}`);
  addRow(wsSummary, 'Quota Status', data.system.quota.status);

  addSection(wsSummary, 'Weekly Highlights (7d)');
  addRow(wsSummary, 'AI API Calls (7d)', data.ai.total_calls_7d);
  addRow(wsSummary, 'AI Cost (7d)', `€${(data.ai.total_cost_cents_7d / 100).toFixed(2)}`);
  addRow(wsSummary, 'AI Error Rate (7d)', `${data.ai.error_rate_7d}%`);
  addRow(wsSummary, 'Avg AI Latency (7d)', `${data.ai.avg_latency_ms_7d} ms`);
  addRow(wsSummary, 'Bookings Created (7d)', data.instructors.bookings_created_7d);
  addRow(wsSummary, 'Customer Notes (7d)', data.instructors.customer_notes_7d);
  addRow(wsSummary, 'Active Instructors (7d)', data.instructors.active_7d);

  const adoption = data.ai_adoption ?? {
    toggles_on_today: 0,
    toggles_off_today: 0,
    toggles_7d_total: 0,
    toggles_grouped_by_instructor_7d: [],
  };
  addSection(wsSummary, 'AI Adoption');
  addRow(wsSummary, 'Toggles ON today', adoption.toggles_on_today);
  addRow(wsSummary, 'Toggles OFF today', adoption.toggles_off_today);
  addRow(wsSummary, 'Toggles 7d total', adoption.toggles_7d_total);
  if (adoption.toggles_grouped_by_instructor_7d.length > 0) {
    addSection(wsSummary, 'Top togglers (7d)');
    for (const row of adoption.toggles_grouped_by_instructor_7d) {
      addRow(wsSummary, `  ${row.instructor_id}`, row.toggles);
    }
  }

  addSection(wsSummary, 'Instructor Overview');
  addRow(wsSummary, 'Total Profiles', data.instructors.total_profiles);
  addRow(wsSummary, 'Onboarded (approved)', data.instructors.onboarded_profiles);
  addRow(wsSummary, 'Total Bookings (all time)', data.instructors.total_bookings);
  addRow(wsSummary, 'Active Bookings', data.instructors.active_bookings);

  addSection(wsSummary, 'Health (24h snapshot)');
  addRow(wsSummary, 'Webhook Inbound', data.health_24h.webhook_inbound);
  addRow(wsSummary, 'Webhook Errors', data.health_24h.webhook_errors);
  addRow(wsSummary, 'AI Draft Errors', data.health_24h.ai_draft_errors);
  addRow(wsSummary, 'Escalations', data.health_24h.escalations);

  addFooter(wsSummary);
  wsSummary.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

  // ════════════════════════════════════════════════════════════════
  // Sheet 2: AI 7d
  // ════════════════════════════════════════════════════════════════
  const wsAI = wb.addWorksheet('AI 7d');
  setupSheet(wsAI);
  addTitle(wsAI, 'AI Performance — Last 7 Days');
  addHeader(wsAI);

  addSection(wsAI, 'Usage');
  addRow(wsAI, 'Total API Calls', data.ai.total_calls_7d);
  addRow(wsAI, 'Total Cost', `€${(data.ai.total_cost_cents_7d / 100).toFixed(2)}`, `${data.ai.total_cost_cents_7d} cents`);
  addRow(wsAI, 'Avg Cost per Call', data.ai.total_calls_7d > 0
    ? `€${(data.ai.total_cost_cents_7d / data.ai.total_calls_7d / 100).toFixed(4)}`
    : 'N/A');
  addRow(wsAI, 'Avg Latency', `${data.ai.avg_latency_ms_7d} ms`);
  addRow(wsAI, 'Error Rate', `${data.ai.error_rate_7d}%`);

  addSection(wsAI, 'Drafts (Today Snapshot)');
  addRow(wsAI, 'Generated Today', data.ai.drafts_generated_today);
  addRow(wsAI, 'Sent Today', data.ai.drafts_sent_today);
  addRow(wsAI, 'Pending', data.ai.drafts_pending);
  addRow(wsAI, 'Approval Rate', data.ai.draft_approval_rate !== null ? `${data.ai.draft_approval_rate}%` : null);
  addRow(wsAI, 'Draft Errors Today', data.ai.draft_errors_today);
  addRow(wsAI, 'Escalations Today', data.ai.escalations_today);
  addRow(wsAI, 'AI-Eligible Conversations Today', data.ai.conversations_ai_eligible_today);

  const adoptionAI = data.ai_adoption ?? {
    toggles_on_today: 0,
    toggles_off_today: 0,
    toggles_7d_total: 0,
    toggles_grouped_by_instructor_7d: [],
  };
  addSection(wsAI, 'AI Adoption');
  addRow(wsAI, 'Toggles ON today', adoptionAI.toggles_on_today);
  addRow(wsAI, 'Toggles OFF today', adoptionAI.toggles_off_today);
  addRow(wsAI, 'Toggles 7d total', adoptionAI.toggles_7d_total);
  if (adoptionAI.toggles_grouped_by_instructor_7d.length > 0) {
    addSection(wsAI, 'Top togglers (7d)');
    for (const row of adoptionAI.toggles_grouped_by_instructor_7d) {
      addRow(wsAI, `  ${row.instructor_id}`, row.toggles);
    }
  }

  addFooter(wsAI);
  wsAI.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

  // ════════════════════════════════════════════════════════════════
  // Sheet 3: Bookings 7d
  // ════════════════════════════════════════════════════════════════
  const wsBookings = wb.addWorksheet('Bookings 7d');
  setupSheet(wsBookings);
  addTitle(wsBookings, 'Bookings — Last 7 Days');
  addHeader(wsBookings);

  addSection(wsBookings, 'Aggregates');
  addRow(wsBookings, 'Created (7d)', data.instructors.bookings_created_7d);
  addRow(wsBookings, 'Created Today', data.today.bookings_created);
  addRow(wsBookings, 'Cancelled Today', data.today.bookings_cancelled);
  addRow(wsBookings, 'Total Bookings (all time)', data.instructors.total_bookings);
  addRow(wsBookings, 'Active Bookings', data.instructors.active_bookings);

  addSection(wsBookings, 'Breakdown by Status');
  for (const bs of data.instructors.bookings_by_status) {
    addRow(wsBookings, bs.status, bs.count);
  }
  if (data.instructors.bookings_by_status.length === 0) {
    addRow(wsBookings, '(no bookings)', 'N/A');
  }

  addSection(wsBookings, 'Related Metrics');
  addRow(wsBookings, 'Customer Notes (7d)', data.instructors.customer_notes_7d);
  addRow(wsBookings, 'Human Overrides Today', data.today.human_overrides);

  addFooter(wsBookings);
  wsBookings.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

  // ════════════════════════════════════════════════════════════════
  // Sheet 4: Conversations 7d
  // ════════════════════════════════════════════════════════════════
  const wsConvs = wb.addWorksheet('Conversations 7d');
  setupSheet(wsConvs);
  addTitle(wsConvs, 'Conversations — Last 7 Days');
  addHeader(wsConvs);

  addSection(wsConvs, 'Today Snapshot');
  addRow(wsConvs, 'New Conversations', data.today.conversations_new);
  addRow(wsConvs, 'Open Conversations', data.today.conversations_open);
  addRow(wsConvs, 'Inbound Messages', data.today.messages_inbound);
  addRow(wsConvs, 'Outbound Messages', data.today.messages_outbound);

  addSection(wsConvs, 'Yesterday');
  addRow(wsConvs, 'Open Conversations', data.yesterday.conversations_open);
  addRow(wsConvs, 'Escalations', data.yesterday.escalations);

  addSection(wsConvs, '7-Day Aggregates');
  addRow(wsConvs, 'New Conversations (7d)', null, 'Not yet tracked — requires new query');
  addRow(wsConvs, 'Total Messages (7d)', null, 'Not yet tracked — requires new query');
  addRow(wsConvs, 'Avg Response Time (7d)', null, 'Not yet tracked — requires new query');

  addSection(wsConvs, 'Presence');
  addRow(wsConvs, 'Instructors Online Now', data.presence.online_now);
  addRow(wsConvs, 'Active Last 30m', data.presence.last_30m);
  addRow(wsConvs, 'Offline', data.presence.offline);

  addFooter(wsConvs);
  wsConvs.views = [{ state: 'frozen', ySplit: 3, xSplit: 0 }];

  // ── Write buffer ───────────────────────────────────────────────
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

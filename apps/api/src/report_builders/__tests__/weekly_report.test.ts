import { describe, it, expect } from 'vitest';
import { buildWeeklyReport } from '../weekly_report.js';
import type { ComprehensiveDashboard } from '@frostdesk/db';
import ExcelJS from 'exceljs';

const STUB: ComprehensiveDashboard = {
  system: {
    ai_global_enabled: true,
    ai_whatsapp_enabled: true,
    emergency_disabled: false,
    pilot_instructor_count: 2,
    pilot_max: 100,
    quota: { channel: 'whatsapp', limit: 500, used_today: 12, percentage: 2, status: 'ok' },
  },
  today: {
    conversations_new: 5,
    conversations_open: 3,
    messages_inbound: 22,
    messages_outbound: 18,
    bookings_created: 4,
    bookings_cancelled: 1,
    customer_notes_added: 2,
    human_overrides: 0,
  },
  yesterday: {
    conversations_open: 2,
    escalations: 1,
    draft_approval_rate: 75,
    draft_errors: 0,
    bookings_created: 3,
    instructors_online: 1,
  },
  ai: {
    drafts_generated_today: 8,
    drafts_sent_today: 6,
    drafts_pending: 2,
    draft_approval_rate: 75,
    draft_errors_today: 0,
    escalations_today: 1,
    conversations_ai_eligible_today: 3,
    avg_latency_ms_7d: 320,
    total_cost_cents_7d: 145,
    total_calls_7d: 50,
    error_rate_7d: 2,
  },
  instructors: {
    total_profiles: 5,
    onboarded_profiles: 3,
    active_7d: 2,
    pilot_count: 2,
    total_bookings: 20,
    active_bookings: 8,
    bookings_by_status: [
      { status: 'confirmed', count: 8 },
      { status: 'completed', count: 10 },
      { status: 'cancelled', count: 2 },
    ],
    bookings_created_7d: 4,
    customer_notes_7d: 2,
  },
  presence: { online_now: 1, last_30m: 2, offline: 3 },
  user_access: { logins_today: 3, unique_users_today: 2, active_sessions: 2, logouts_today: 1 },
  health_24h: {
    webhook_inbound: 40,
    webhook_errors: 0,
    webhook_last_error_at: null,
    ai_draft_errors: 0,
    quota_exceeded: 0,
    escalations: 1,
  },
  recent_events: [],
  generated_at: new Date().toISOString(),
};

describe('buildWeeklyReport', () => {
  it('returns a valid xlsx buffer', async () => {
    const buf = await buildWeeklyReport(STUB, 'test');
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf[0]).toBe(0x50); // P (zip magic)
    expect(buf[1]).toBe(0x4b); // K
  });

  it('contains 4 worksheets', async () => {
    const buf = await buildWeeklyReport(STUB, 'test');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.worksheets.length).toBe(4);
    const names = wb.worksheets.map((ws) => ws.name);
    expect(names).toContain('Weekly Summary');
    expect(names).toContain('AI 7d');
    expect(names).toContain('Bookings 7d');
    expect(names).toContain('Conversations 7d');
  });

  it('buffer size > 4 KB', async () => {
    const buf = await buildWeeklyReport(STUB, 'test');
    expect(buf.length).toBeGreaterThan(4096);
  });
});

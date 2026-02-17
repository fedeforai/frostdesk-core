'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  fetchComprehensiveDashboard,
  updateFeatureFlag,
  type ComprehensiveDashboardData,
} from '@/lib/adminApi';
import ReportArchive from './ReportArchive';
import s from './dashboard.module.css';

// ── Auto-refresh interval (ms) ──────────────────────────────────────────
const REFRESH_INTERVAL = 60_000;

// ── Helpers ─────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return iso; }
}

function pct(n: number | null): string {
  return n !== null ? `${n}%` : '—';
}

function delta(today: number, yesterday: number): { label: string; direction: 'up' | 'down' | 'neutral' } {
  if (yesterday === 0 && today === 0) return { label: '—', direction: 'neutral' };
  if (yesterday === 0) return { label: `+${today}`, direction: 'up' };
  const diff = today - yesterday;
  const p = Math.round((diff / yesterday) * 100);
  if (p === 0) return { label: '0%', direction: 'neutral' };
  return { label: `${p > 0 ? '+' : ''}${p}%`, direction: p > 0 ? 'up' : 'down' };
}

function deltaRate(today: number | null, yesterday: number | null): { label: string; direction: 'up' | 'down' | 'neutral' } {
  if (today === null || yesterday === null) return { label: '—', direction: 'neutral' };
  const diff = today - yesterday;
  if (diff === 0) return { label: '0pp', direction: 'neutral' };
  return { label: `${diff > 0 ? '+' : ''}${diff}pp`, direction: diff > 0 ? 'up' : 'down' };
}

function computeConfidence(data: ComprehensiveDashboardData): number {
  let sc = 100;
  const ai = data.ai ?? {};
  const h = data.health_24h ?? {};
  const sys = data.system ?? {};
  if ((ai as any).error_rate_7d > 10) sc -= 30;
  else if ((ai as any).error_rate_7d > 5) sc -= 15;
  else if ((ai as any).error_rate_7d > 0) sc -= 5;
  if ((ai as any).escalations_today > 10) sc -= 20;
  else if ((ai as any).escalations_today > 5) sc -= 10;
  else if ((ai as any).escalations_today > 0) sc -= 3;
  if (sys.quota?.status === 'exceeded') sc -= 25;
  else if (sys.quota?.percentage != null && sys.quota.percentage > 90) sc -= 10;
  if ((h as any).webhook_errors > 10) sc -= 20;
  else if ((h as any).webhook_errors > 0) sc -= 5;
  if (sys.emergency_disabled) sc -= 30;
  return Math.max(0, Math.min(100, sc));
}

function confColor(sc: number): string {
  if (sc >= 80) return 'var(--admin-ok)';
  if (sc >= 50) return 'var(--admin-warn)';
  return 'var(--admin-critical)';
}

function sevColor(sev: string) {
  const m: Record<string, { bg: string; fg: string }> = {
    info: { bg: 'var(--admin-info-dim)', fg: 'var(--admin-info)' },
    warn: { bg: 'var(--admin-warn-dim)', fg: 'var(--admin-warn)' },
    error: { bg: 'var(--admin-critical-dim)', fg: 'var(--admin-critical)' },
  };
  return m[sev] ?? m.info;
}

// ── Reusable sub-components ─────────────────────────────────────────────

function SectionGroup({
  id,
  title,
  icon,
  defaultOpen = true,
  alwaysOpen = false,
  children,
}: {
  id: string;
  title: string;
  icon: string;
  defaultOpen?: boolean;
  alwaysOpen?: boolean;
  children: React.ReactNode;
}) {
  const storageKey = `admin-section-${id}`;
  const [open, setOpen] = useState(() => {
    if (alwaysOpen) return true;
    if (typeof window === 'undefined') return defaultOpen;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored !== null ? stored === '1' : defaultOpen;
    } catch { return defaultOpen; }
  });

  const toggle = () => {
    if (alwaysOpen) return;
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(storageKey, next ? '1' : '0'); } catch {}
  };

  if (alwaysOpen) {
    return (
      <div className={s.sectionGroupAlwaysOpen}>
        <div className={s.sectionGroupAlwaysOpenHeader}>
          <span className={s.sectionGroupIcon}>{icon}</span> {title}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={s.sectionGroup}>
      <button type="button" className={s.sectionGroupHeader} onClick={toggle}>
        <span>
          <span className={s.sectionGroupIcon}>{icon}</span> {title}
        </span>
        <span className={`${s.sectionGroupChevron} ${open ? s.sectionGroupChevronOpen : s.sectionGroupChevronClosed}`}>
          ▾
        </span>
      </button>
      {open && <div className={s.sectionGroupBody}>{children}</div>}
    </div>
  );
}

function StatusCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={s.statusCard}>
      <div className={s.statusCardLabel}>{label}</div>
      <div className={s.statusCardValue}>{children}</div>
    </div>
  );
}

function FlagToggle({
  flagKey,
  current,
  onSuccess,
}: {
  flagKey: 'ai_enabled' | 'ai_whatsapp_enabled';
  current: boolean;
  onSuccess: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const handleClick = async () => {
    setUpdating(true);
    try {
      const result = await updateFeatureFlag(flagKey, !current);
      if (result) onSuccess();
    } finally {
      setUpdating(false);
    }
  };
  return (
    <button
      type="button"
      className={s.flagToggleBtn}
      onClick={handleClick}
      disabled={updating}
      title={current ? 'Disable' : 'Enable'}
    >
      {updating ? '…' : current ? 'Disable' : 'Enable'}
    </button>
  );
}

function KpiCard({ label, value, deltaInfo, href, accent }: {
  label: string;
  value: string | number;
  deltaInfo?: { label: string; direction: 'up' | 'down' | 'neutral' };
  href?: string;
  accent?: string;
}) {
  const inner = (
    <>
      <div className={s.kpiLabel}>{label}</div>
      <div className={s.kpiValue} style={accent ? { color: accent } : undefined}>{value}</div>
      {deltaInfo && deltaInfo.label !== '—' && (
        <div className={`${s.kpiDelta} ${deltaInfo.direction === 'up' ? s.kpiDeltaUp : deltaInfo.direction === 'down' ? s.kpiDeltaDown : s.kpiDeltaNeutral}`}>
          {deltaInfo.direction === 'up' ? '↑' : deltaInfo.direction === 'down' ? '↓' : ''} vs yesterday: {deltaInfo.label}
        </div>
      )}
    </>
  );
  if (href) return <Link href={href} className={s.kpiCard}>{inner}</Link>;
  return <div className={s.kpiCard}>{inner}</div>;
}

function CardRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className={s.cardRow}>
      <span className={s.cardRowLabel}>{label}</span>
      <span className={s.cardRowValue} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ComprehensiveDashboard() {
  const [data, setData] = useState<ComprehensiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchComprehensiveDashboard();
      if (result) setData(result);
      else setError(true);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  // Auto-refresh (silent, no loading spinner)
  useEffect(() => {
    const id = setInterval(() => {
      fetchComprehensiveDashboard().then((r) => { if (r) setData(r); }).catch(() => {});
    }, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // ── Loading / Error states ──────────────────────────────────────────

  if (loading) return <div className={s.loading}>Loading dashboard...</div>;

  if (error || !data) {
    return (
      <div className={s.error}>
        Unable to load data.
        <br />
        <button type="button" onClick={load} className={s.refreshBtn} style={{ margin: '1rem auto', display: 'inline-flex' }}>Retry</button>
      </div>
    );
  }

  // ── Safe destructuring with fallbacks ───────────────────────────────

  const system = data.system ?? { ai_global_enabled: false, ai_whatsapp_enabled: false, emergency_disabled: false, pilot_instructor_count: 0, pilot_max: 100, quota: { channel: 'whatsapp' as const, limit: null, used_today: null, percentage: null, status: 'not_configured' as const } };
  const today = data.today ?? { conversations_new: 0, conversations_open: 0, messages_inbound: 0, messages_outbound: 0, bookings_created: 0, bookings_cancelled: 0, customer_notes_added: 0, human_overrides: 0 };
  const ai = data.ai ?? { drafts_generated_today: 0, drafts_sent_today: 0, drafts_pending: 0, draft_approval_rate: null, draft_errors_today: 0, escalations_today: 0, conversations_ai_eligible_today: 0, avg_latency_ms_7d: 0, total_cost_cents_7d: 0, total_calls_7d: 0, error_rate_7d: 0 };
  const instructors = data.instructors ?? { total_profiles: 0, onboarded_profiles: 0, active_7d: 0, pilot_count: 0, total_bookings: 0, active_bookings: 0, bookings_by_status: [], bookings_created_7d: 0, customer_notes_7d: 0 };
  const health_24h = data.health_24h ?? { webhook_inbound: 0, webhook_errors: 0, webhook_last_error_at: null, ai_draft_errors: 0, quota_exceeded: 0, escalations: 0 };
  const recent_events = data.recent_events ?? [];
  const ai_adoption = data.ai_adoption ?? {
    toggles_on_today: 0,
    toggles_off_today: 0,
    toggles_7d_total: 0,
    toggles_grouped_by_instructor_7d: [],
    recent_ai_behavior_events: [],
  };

  const yesterday = data.yesterday ?? { conversations_open: 0, escalations: 0, draft_approval_rate: null, draft_errors: 0, bookings_created: 0, instructors_online: 0 };
  const presence = data.presence ?? { online_now: 0, last_30m: 0, offline: instructors.total_profiles };
  const user_access = data.user_access ?? { logins_today: 0, unique_users_today: 0, active_sessions: 0, logouts_today: 0 };

  const confidence = computeConfidence(data);
  const quotaPct = system.quota?.percentage ?? 0;
  const quotaColor = quotaPct > 90 ? 'var(--admin-critical)' : quotaPct > 70 ? 'var(--admin-warn)' : 'var(--admin-ok)';

  return (
    <div className={s.page}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <h1 className={s.title}>Admin Dashboard</h1>
          <div className={s.freshness}>
            <span className={s.liveDot} />
            Updated {formatTime(data.generated_at)} · Auto-refresh 60s
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button type="button" className={s.refreshBtn} onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen} aria-haspopup="true">↓ Export</button>
            {exportOpen && (
              <div className={s.exportDropdown}>
                <a href="/api/admin/reports/daily" target="_blank" rel="noopener noreferrer" className={s.exportItem} onClick={() => setExportOpen(false)}>
                  <span style={{ fontSize: '1rem' }}>📊</span>
                  <span>
                    <span className={s.exportItemLabel}>Daily Snapshot (Excel)</span>
                    <span className={s.exportItemHint}>Downloads .xlsx</span>
                  </span>
                </a>
                <a href="/api/admin/reports/weekly" target="_blank" rel="noopener noreferrer" className={s.exportItem} onClick={() => setExportOpen(false)}>
                  <span style={{ fontSize: '1rem' }}>📈</span>
                  <span>
                    <span className={s.exportItemLabel}>Weekly Summary (Excel)</span>
                    <span className={s.exportItemHint}>4 sheets · Downloads .xlsx</span>
                  </span>
                </a>
                <a href="/api/admin/reports/investor" target="_blank" rel="noopener noreferrer" className={s.exportItem} onClick={() => setExportOpen(false)}>
                  <span style={{ fontSize: '1rem' }}>📄</span>
                  <span>
                    <span className={s.exportItemLabel}>Investor Snapshot (PDF)</span>
                    <span className={s.exportItemHint}>10 KPI · Downloads .pdf</span>
                  </span>
                </a>
              </div>
            )}
          </div>
          <button type="button" onClick={() => { load(); }} className={s.refreshBtn}>↻ Refresh</button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* A) CONTROL ROOM — always open                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionGroup id="control-room" title="Control Room" icon="🎛️" alwaysOpen>
        {/* System Health Row */}
        <div className={s.statusRow}>
          <StatusCard label="System Status">
            <span className={s.statusDot} style={{ background: !system.emergency_disabled && system.ai_global_enabled ? 'var(--admin-ok)' : 'var(--admin-critical)' }} />
            <span className={s.statusLabel}>
              {!system.emergency_disabled && system.ai_global_enabled ? 'Operational' : system.emergency_disabled ? 'Emergency Kill Active' : 'AI Disabled'}
            </span>
          </StatusCard>
          <StatusCard label="AI Global">
            <span className={s.statusIcon}>{system.ai_global_enabled ? '✓' : '✗'}</span>
            <span className={s.statusLabel} style={{ color: system.ai_global_enabled ? 'var(--admin-ok)' : 'var(--admin-critical)' }}>
              {system.ai_global_enabled ? 'Enabled' : 'Disabled'}
            </span>
            <FlagToggle
              flagKey="ai_enabled"
              current={system.ai_global_enabled}
              onSuccess={load}
            />
          </StatusCard>
          <StatusCard label="AI WhatsApp">
            <span className={s.statusIcon}>{system.ai_whatsapp_enabled ? '✓' : '✗'}</span>
            <span className={s.statusLabel} style={{ color: system.ai_whatsapp_enabled ? 'var(--admin-ok)' : 'var(--admin-critical)' }}>
              {system.ai_whatsapp_enabled ? 'Enabled' : 'Disabled'}
            </span>
            <FlagToggle
              flagKey="ai_whatsapp_enabled"
              current={system.ai_whatsapp_enabled}
              onSuccess={load}
            />
          </StatusCard>
          <StatusCard label="Emergency Kill">
            <span className={s.statusIcon}>{system.emergency_disabled ? '✗' : '✓'}</span>
            <span className={s.statusLabel} style={{ color: system.emergency_disabled ? 'var(--admin-critical)' : 'var(--admin-ok)' }}>
              {system.emergency_disabled ? 'ACTIVE' : 'Inactive'}
            </span>
          </StatusCard>
          <StatusCard label="Available Quota">
            <span className={s.quotaNumber} style={{ color: quotaColor }}>
              {system.quota?.status === 'not_configured' ? 'N/C' : `${100 - quotaPct}%`}
            </span>
            {system.quota?.status !== 'not_configured' && (
              <>
                <div className={s.quotaBar}><div className={s.quotaFill} style={{ width: `${quotaPct}%`, background: quotaColor }} /></div>
                <div className={s.quotaLabel}>{system.quota?.used_today ?? 0}/{system.quota?.limit ?? '∞'} used</div>
              </>
            )}
          </StatusCard>
        </div>

        {/* Operational Confidence Score */}
        <div className={s.confidenceScore}>
          <div className={s.confidenceNumber} style={{ color: confColor(confidence) }}>{confidence}</div>
          <div className={s.confidenceInfo}>
            <div className={s.confidenceLabel}>Operational Confidence Score</div>
            <div className={s.confidenceSub}>error rate AI · escalation · quota · webhook errors · emergency kill</div>
          </div>
        </div>

        {/* Core KPI Grid (6 max) */}
        <div className={s.kpiGrid}>
          <KpiCard label="Open Conversations" value={today.conversations_open} deltaInfo={delta(today.conversations_open, yesterday.conversations_open)} href="/admin/human-inbox?status=open" />
          <KpiCard label="Escalations Today" value={ai.escalations_today} deltaInfo={delta(ai.escalations_today, yesterday.escalations)} href="/admin/human-inbox?status=requires_human" accent={ai.escalations_today > 5 ? 'var(--admin-warn)' : undefined} />
          <KpiCard label="AI Approval Rate" value={pct(ai.draft_approval_rate)} deltaInfo={deltaRate(ai.draft_approval_rate, yesterday.draft_approval_rate)} accent={ai.draft_approval_rate !== null && ai.draft_approval_rate < 50 ? 'var(--admin-critical)' : 'var(--admin-ok)'} />
          <KpiCard label="AI Errors Today" value={ai.draft_errors_today} deltaInfo={delta(ai.draft_errors_today, yesterday.draft_errors)} accent={ai.draft_errors_today > 0 ? 'var(--admin-critical)' : undefined} />
          <KpiCard label="Bookings Created" value={today.bookings_created} deltaInfo={delta(today.bookings_created, yesterday.bookings_created)} href="/admin/bookings" />
          <KpiCard label="Instructors Online" value={presence.online_now} deltaInfo={delta(presence.online_now, yesterday.instructors_online)} accent={presence.online_now === 0 ? 'var(--admin-critical)' : 'var(--admin-ok)'} />
        </div>
      </SectionGroup>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* B) OPERATIONS                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionGroup id="operations" title="Operations" icon="📊" defaultOpen>
        <div className={s.cardGrid3}>
          {/* Today's Metrics */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>📊</span> Today&apos;s Metrics</div>
            <CardRow label="New conversations" value={today.conversations_new} />
            <CardRow label="Open conversations" value={today.conversations_open} />
            <CardRow label="Inbound messages" value={today.messages_inbound} />
            <CardRow label="Outbound messages" value={today.messages_outbound} />
          </div>
          {/* Bookings Today */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>📅</span> Bookings Today</div>
            <CardRow label="Bookings created" value={today.bookings_created} color="var(--admin-accent)" />
            <CardRow label="Bookings cancelled" value={today.bookings_cancelled} color={today.bookings_cancelled > 0 ? 'var(--admin-critical)' : undefined} />
            <CardRow label="Customer notes added" value={today.customer_notes_added} />
            <CardRow label="Manual overrides" value={today.human_overrides} />
          </div>
          {/* User Access */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>🔑</span> User Access</div>
            <CardRow label="Logins today" value={user_access.logins_today} color="var(--admin-accent)" />
            <CardRow label="Unique users" value={user_access.unique_users_today} />
            <CardRow label="Active sessions" value={user_access.active_sessions} />
            <CardRow label="Logouts" value={user_access.logouts_today} color="var(--admin-critical)" />
          </div>
        </div>
      </SectionGroup>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* C) AI & AUTOMATION                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionGroup id="ai-automation" title="AI & Automation" icon="🤖" defaultOpen>
        <div className={s.cardGrid3}>
          {/* AI Usage */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>🤖</span> AI Usage</div>
            <CardRow label="AI runs today" value={ai.drafts_generated_today} />
            <CardRow label="Successful" value={ai.drafts_generated_today - ai.draft_errors_today} color="var(--admin-ok)" />
            <CardRow label="Failures" value={ai.draft_errors_today} color={ai.draft_errors_today > 0 ? 'var(--admin-critical)' : undefined} />
            <CardRow label="Remaining quota" value={system.quota?.status === 'not_configured' ? 'N/C' : `${100 - (system.quota?.percentage ?? 0)}%`} />
          </div>
          {/* AI Performance 7d */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>📈</span> Performance (7 days)</div>
            <CardRow label="Total calls" value={ai.total_calls_7d} />
            <CardRow label="Total cost" value={`$${(ai.total_cost_cents_7d / 100).toFixed(2)}`} />
            <CardRow label="Avg latency" value={`${ai.avg_latency_ms_7d}ms`} color={ai.avg_latency_ms_7d > 3000 ? 'var(--admin-critical)' : undefined} />
            <CardRow label="Error rate" value={`${ai.error_rate_7d}%`} color={ai.error_rate_7d > 5 ? 'var(--admin-critical)' : undefined} />
          </div>
          {/* Escalations & Pending */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>⚠️</span> Escalations & Drafts</div>
            <CardRow label="Escalations today" value={ai.escalations_today} color={ai.escalations_today > 3 ? 'var(--admin-warn)' : undefined} />
            <CardRow label="Pending drafts" value={ai.drafts_pending} color={ai.drafts_pending > 5 ? 'var(--admin-warn)' : undefined} />
            <CardRow label="Drafts sent today" value={ai.drafts_sent_today} />
            <CardRow label="AI-eligible convs" value={ai.conversations_ai_eligible_today} />
          </div>
        </div>
      </SectionGroup>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AI ADOPTION                                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionGroup id="ai-adoption" title="AI Adoption" icon="📱" defaultOpen={false}>
        <div className={s.cardGrid3}>
          <div className={s.card}>
            <div className={s.cardTitle}><span>🟢</span> Toggles ON today</div>
            <CardRow label="Count" value={ai_adoption.toggles_on_today} color="var(--admin-ok)" />
          </div>
          <div className={s.card}>
            <div className={s.cardTitle}><span>🔴</span> Toggles OFF today</div>
            <CardRow label="Count" value={ai_adoption.toggles_off_today} color={ai_adoption.toggles_off_today > 0 ? 'var(--admin-warn)' : undefined} />
          </div>
          <div className={s.card}>
            <div className={s.cardTitle}><span>📊</span> Toggles 7d total</div>
            <CardRow label="Count" value={ai_adoption.toggles_7d_total} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginTop: '1rem' }}>
          <div className={s.card}>
            <div className={s.cardTitle}><span>📋</span> Recent AI behavior events</div>
            {ai_adoption.recent_ai_behavior_events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--admin-text-muted)', fontSize: '0.8125rem' }}>No recent events</div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', padding: '0.375rem 0', borderBottom: '1px solid var(--admin-border)', fontSize: '0.6875rem', color: 'var(--admin-text-muted)', fontWeight: 600 }}>
                  <span>Time</span><span>Instructor</span><span>State</span>
                </div>
                {ai_adoption.recent_ai_behavior_events.slice(0, 12).map((evt, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--admin-border)', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--admin-text-dim)' }}>{formatTime(evt.created_at)}</span>
                    <span style={{ fontWeight: 500, color: 'var(--admin-text-primary)' }}>{evt.instructor_id}</span>
                    <span style={{ color: evt.new_state ? 'var(--admin-ok)' : 'var(--admin-warn)' }}>{evt.new_state ? 'ON' : 'OFF'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={s.card} style={{ minWidth: 220 }}>
            <div className={s.cardTitle}><span>🏆</span> Top togglers (7d)</div>
            {ai_adoption.toggles_grouped_by_instructor_7d.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--admin-text-muted)', fontSize: '0.8125rem' }}>No data</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {ai_adoption.toggles_grouped_by_instructor_7d.slice(0, 8).map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--admin-border)', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--admin-text-primary)' }}>{row.instructor_id}</span>
                    <span style={{ color: 'var(--admin-accent)' }}>{row.toggles}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionGroup>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* D) INSTRUCTORS & PILOT                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionGroup id="instructors-pilot" title="Instructors & Pilot" icon="👥" defaultOpen={false}>
        <div className={s.cardGrid3}>
          {/* Active Instructors */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>👥</span> Active Instructors</div>
            <CardRow label="Total instructors" value={instructors.total_profiles} />
            <CardRow label="Online now" value={presence.online_now} color="var(--admin-ok)" />
            <CardRow label="Last 30 min" value={presence.last_30m} />
            <CardRow label="Offline" value={presence.offline} color={presence.offline > 0 ? 'var(--admin-text-muted)' : undefined} />
            <div className={s.presenceBadge}>Presence: estimated from auth.sessions</div>
          </div>
          {/* Pilot & Onboarding */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>🚀</span> Pilot & Onboarding</div>
            <CardRow label="Active pilots" value={instructors.pilot_count} />
            <CardRow label="Onboarded" value={`${instructors.onboarded_profiles} (${instructors.total_profiles > 0 ? Math.round((instructors.onboarded_profiles / instructors.total_profiles) * 100) : 0}%)`} />
            <CardRow label="Active (7d)" value={instructors.active_7d} />
            <CardRow label="Customer notes (7d)" value={instructors.customer_notes_7d} />
          </div>
          {/* Booking Status */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>📅</span> Booking Status</div>
            <CardRow label="Total bookings" value={instructors.total_bookings} />
            <CardRow label="Active bookings" value={instructors.active_bookings} />
            <CardRow label="Created (7d)" value={instructors.bookings_created_7d} />
            {instructors.bookings_by_status.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                {instructors.bookings_by_status.map((b) => {
                  const colors: Record<string, string> = { pending: 'var(--admin-warn)', confirmed: 'var(--admin-ok)', cancelled: 'var(--admin-critical)', completed: 'var(--admin-info)', no_show: 'var(--admin-text-muted)' };
                  const c = colors[b.status] ?? 'var(--admin-text-muted)';
                  return (
                    <span key={b.status} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 500, color: c, background: 'var(--admin-bg-card-hover)', border: '1px solid var(--admin-border-light)' }}>
                      {b.status}: {b.count}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionGroup>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* E) SYSTEM & FLAGS                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionGroup id="system-flags" title="System & Flags" icon="⚙️" defaultOpen={false}>
        <div className={s.cardGrid3}>
          {/* Feature Flags */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>🚩</span> Feature Flags</div>
            <div className={s.flagRow}>
              <span className={s.flagLabel}>Pilot X Instructors</span>
              <span className={`${s.flagBadge} ${s.flagCount}`}>{system.pilot_instructor_count}/{system.pilot_max ?? 100}</span>
            </div>
            <div className={s.flagRow}>
              <span className={s.flagLabel}>AI Globale</span>
              <span className={`${s.flagBadge} ${system.ai_global_enabled ? s.flagOn : s.flagOff}`}>{system.ai_global_enabled ? '✓ ON' : '✗ OFF'}</span>
            </div>
            <div className={s.flagRow}>
              <span className={s.flagLabel}>AI WhatsApp</span>
              <span className={`${s.flagBadge} ${system.ai_whatsapp_enabled ? s.flagOn : s.flagOff}`}>{system.ai_whatsapp_enabled ? '✓ ON' : '✗ OFF'}</span>
            </div>
            <div className={s.flagRow}>
              <span className={s.flagLabel}>Emergency Kill</span>
              <span className={`${s.flagBadge} ${!system.emergency_disabled ? s.flagOn : s.flagOff}`}>{system.emergency_disabled ? '⚠ ACTIVE' : '✓ OFF'}</span>
            </div>
          </div>
          {/* System Health 24h */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>🏥</span> System Health (24h)</div>
            <CardRow label="Webhooks received" value={health_24h.webhook_inbound} />
            <CardRow label="Webhook errors" value={health_24h.webhook_errors} color={health_24h.webhook_errors > 0 ? 'var(--admin-critical)' : undefined} />
            <CardRow label="AI draft errors" value={health_24h.ai_draft_errors} color={health_24h.ai_draft_errors > 0 ? 'var(--admin-critical)' : undefined} />
            <CardRow label="Quota exceeded" value={health_24h.quota_exceeded} color={health_24h.quota_exceeded > 0 ? 'var(--admin-warn)' : undefined} />
            <CardRow label="Escalations (24h)" value={health_24h.escalations} color={health_24h.escalations > 3 ? 'var(--admin-warn)' : undefined} />
            {health_24h.webhook_last_error_at && (
              <CardRow label="Last error" value={formatTime(health_24h.webhook_last_error_at)} />
            )}
          </div>
          {/* Audit Log */}
          <div className={s.card}>
            <div className={s.cardTitle}><span>📋</span> Recent Activity</div>
            {recent_events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '0.75rem', color: 'var(--admin-text-muted)', fontSize: '0.8125rem' }}>No recent events</div>
            ) : (
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {recent_events.slice(0, 8).map((evt) => {
                  const sc = sevColor(evt.severity);
                  return (
                    <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.375rem 0', borderBottom: '1px solid var(--admin-border)', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontWeight: 500, color: 'var(--admin-text-primary)' }}>{evt.action}</span>
                        <span style={{ color: 'var(--admin-text-dim)' }}>{evt.actor_type} · {formatTime(evt.created_at)}</span>
                      </div>
                      <span className={s.severityBadge} style={{ background: sc.bg, color: sc.fg }}>{evt.severity}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SectionGroup>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* REPORT ARCHIVE                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <ReportArchive />
    </div>
  );
}

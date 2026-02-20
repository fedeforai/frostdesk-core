'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import StatusPill from '@/components/shared/StatusPill';
import { useApiHealth } from '@/components/shared/useApiHealth';
import { useToast } from '@/components/shell/ToastContext';
import { fetchInstructorDashboardViaApi, getAIFeatureStatus, setAIFeatureStatus } from '@/lib/instructorApi';
import AutomationCard from './cards/AutomationCard';
import HotLeadsCard from './cards/HotLeadsCard';
import ConversationCard from './cards/ConversationCard';
import FunnelCard from './cards/FunnelCard';
import BusinessDashboardSection from './business/BusinessDashboardSection';
import ConnectionStatusBadges from './business/ConnectionStatusBadges';
import type { Lead } from './cards/HotLeadsCard';
import type { Conversation } from './cards/ConversationCard';
import type { FunnelKpiResponse } from '@/lib/instructorApi';
import styles from './dashboard.module.css';

/** Same-origin proxy: Next fetches 3001 server-side; browser never hits 3001 (CORS). */
const HEALTH_URL = '/api/health';

const DEFAULT_KPI_TILES: Array<{ value: number | string; label: string }> = [
  { value: 0, label: 'Drafts generated' },
  { value: 0, label: 'Drafts used' },
  { value: 0, label: 'Drafts ignored' },
  { value: '0%', label: 'Draft usage rate' },
];

export type HomeDashboardProps = {
  leads?: Lead[];
  conversation?: Conversation | null;
  loading?: boolean;
  error?: { status?: number; message: string } | null;
  empty?: boolean;
  onRetry?: () => void;
  /** Draft KPI from GET /instructor/kpis/summary (L1 polling in parent). When omitted, shows zeros. */
  kpiTiles?: Array<{ value: number | string; label: string }>;
  /** Funnel KPI from GET /instructor/kpis/funnel. When omitted or null, FunnelCard shows empty message. */
  funnel?: FunnelKpiResponse | null;
  /** Primary action href for FunnelCard (e.g. /instructor/bookings/new). When set, primary button becomes a Link. */
  funnelPrimaryHref?: string;
};

export default function HomeDashboard({
  leads = [],
  conversation = null,
  loading = false,
  error = null,
  empty = false,
  onRetry,
  kpiTiles: kpiTilesProp = DEFAULT_KPI_TILES,
  funnel = null,
  funnelPrimaryHref,
}: HomeDashboardProps = {}) {
  const health = useApiHealth(HEALTH_URL);
  const onToast = useToast();
  const [automationOn, setAutomationOn] = useState(false);
  const [automationLoading, setAutomationLoading] = useState(true);
  const [automationActing, setAutomationActing] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const kpiTiles = kpiTilesProp;

  const AI_STATUS_TIMEOUT_MS = 10_000;

  const loadAiStatus = useCallback(async () => {
    setAutomationLoading(true);
    try {
      const res = await Promise.race([
        getAIFeatureStatus(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI status timed out')), AI_STATUS_TIMEOUT_MS)
        ),
      ]);
      setAutomationOn(res.enabled);
    } catch {
      setAutomationOn(false);
    } finally {
      setAutomationLoading(false);
    }
  }, []);

  const handleAutomationToggle = useCallback(async () => {
    if (automationLoading || automationActing) return;
    const next = !automationOn;
    const prev = automationOn;
    setAutomationOn(next);
    setAutomationActing(true);
    try {
      await setAIFeatureStatus(next);
      onToast?.(next ? 'Automation is ON' : 'Automation is OFF');
    } catch (e) {
      setAutomationOn(prev);
      const msg = e instanceof Error ? e.message : 'Failed to update';
      onToast?.(msg, true);
    } finally {
      setAutomationActing(false);
    }
  }, [automationOn, automationLoading, automationActing, onToast]);

  const DASHBOARD_CALENDAR_TIMEOUT_MS = 10_000;

  const loadDashboardCalendar = useCallback(async () => {
    try {
      const data = await Promise.race([
        fetchInstructorDashboardViaApi(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Dashboard request timed out')), DASHBOARD_CALENDAR_TIMEOUT_MS)
        ),
      ]);
      setCalendarConnected(data.calendar?.connected ?? false);
    } catch {
      setCalendarConnected(false);
    }
  }, []);

  useEffect(() => {
    void loadAiStatus();
  }, [loadAiStatus]);

  useEffect(() => {
    void loadDashboardCalendar();
  }, [loadDashboardCalendar]);

  const frostDeskStatus =
    health.status === 'ok' ? 'Connected' : health.status === 'error' ? 'Disconnected' : 'Checking…';
  const googleCalendarStatus =
    health.status === 'error'
      ? 'Unavailable'
      : calendarConnected === null
        ? 'Checking…'
        : calendarConnected
          ? 'Connected'
          : 'Not connected';
  const integrations = [
    { name: 'FrostDesk switch', status: frostDeskStatus },
    { name: 'Google Calendar', status: googleCalendarStatus },
  ];

  const pillLabel =
    health.status === 'ok'
      ? 'API connected'
      : health.status === 'error'
        ? 'API disconnected'
        : 'Checking…';
  const pillTone =
    health.status === 'ok'
      ? 'success'
      : health.status === 'error'
        ? 'danger'
        : 'muted';

  return (
    <div className={styles.wrap}>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSub}>Overview and automations</p>

      <div style={{ marginBottom: 16 }}>
        <ConnectionStatusBadges
          frostDeskConnected={health.status === 'ok'}
          calendarConnected={calendarConnected}
        />
      </div>

      <div className={styles.topbar}>
        <div className={styles.title}>
          Automation switch
          {!automationLoading && (
            <span style={{ fontWeight: 600, marginLeft: 8, color: automationOn ? 'rgba(74, 222, 128, 0.95)' : 'rgba(148, 163, 184, 0.9)' }}>
              · {automationOn ? 'ON' : 'OFF'}
            </span>
          )}
        </div>
        <div className={styles.right}>
          {health.status === 'error' && (
            <span style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.9)', marginRight: '0.75rem' }}>
              Start API to connect
            </span>
          )}
          <StatusPill label={pillLabel} tone={pillTone} />
        </div>
      </div>

      {error && (
        <section className={styles.section} aria-label="Error">
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ color: 'rgba(252, 165, 165, 0.95)', fontSize: '14px' }}>
              {error.status === 401 || /UNAUTHORIZED|No session/i.test(error.message)
                ? 'Session expired or not authenticated. '
                : error.message}
            </span>
            {error.status === 401 || /UNAUTHORIZED|No session/i.test(error.message) ? (
              <Link
                href="/instructor/login"
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'rgba(252, 165, 165, 0.95)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Login
              </Link>
            ) : onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  padding: '6px 12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'rgba(252, 165, 165, 0.95)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            ) : null}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <AutomationCard
          automationOn={automationOn}
          onToggle={handleAutomationToggle}
          disabled={automationLoading || automationActing}
          kpis={kpiTiles}
          integrations={integrations}
        />
      </section>

      <section className={styles.gridSection}>
        <div className={styles.threeCol}>
          {error ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)', gridColumn: '1 / -1' }}>
              Retry above to load conversations.
            </div>
          ) : loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
              Loading live data…
            </div>
          ) : empty ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
              No conversations yet
            </div>
          ) : (
            <HotLeadsCard leads={leads} />
          )}
          {!error && loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'rgba(148, 163, 184, 0.9)' }}>
              Loading…
            </div>
          ) : (
            <ConversationCard
              conversation={
                conversation ?? {
                  leadName: '—',
                  meta: '—',
                  lastMessage: 'Select a conversation in Inbox',
                }
              }
            />
          )}
          <FunnelCard
            funnel={funnel}
            emptyMessage="Not enough data"
            primaryLabel="Create test booking"
            primaryHref={funnelPrimaryHref}
            secondaryLabel="Open Inbox"
            secondaryHref="/instructor/inbox"
          />
        </div>
      </section>

      <section className={styles.section} aria-label="Business Intelligence">
        <BusinessDashboardSection />
      </section>
    </div>
  );
}

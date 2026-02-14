'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import StatusPill from '@/components/shared/StatusPill';
import { useApiHealth } from '@/components/shared/useApiHealth';
import { fetchInstructorDashboardViaApi } from '@/lib/instructorApi';
import AutomationCard from './cards/AutomationCard';
import HotLeadsCard from './cards/HotLeadsCard';
import ConversationCard from './cards/ConversationCard';
import FunnelCard from './cards/FunnelCard';
import type { Lead } from './cards/HotLeadsCard';
import type { Conversation } from './cards/ConversationCard';
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
};

export default function HomeDashboard({
  leads = [],
  conversation = null,
  loading = false,
  error = null,
  empty = false,
  onRetry,
  kpiTiles: kpiTilesProp = DEFAULT_KPI_TILES,
}: HomeDashboardProps = {}) {
  const health = useApiHealth(HEALTH_URL);
  const [automationOn, setAutomationOn] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null);
  const kpiTiles = kpiTilesProp;

  const loadDashboardCalendar = useCallback(async () => {
    try {
      const data = await fetchInstructorDashboardViaApi();
      setCalendarConnected(data.calendar?.connected ?? false);
    } catch {
      setCalendarConnected(false);
    }
  }, []);

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
      <p className={styles.pageSub}>Panoramica e automazioni</p>
      <div className={styles.topbar}>
        <div className={styles.title}>Automation switch</div>
        <div className={styles.right}>
          {health.status === 'error' && (
            <span style={{ fontSize: '0.8125rem', color: '#94a3b8', marginRight: '0.75rem' }}>
              Start API to connect
            </span>
          )}
          <StatusPill label={pillLabel} tone={pillTone} />
        </div>
      </div>

      {error && (
        <section className={styles.section} aria-label="Error">
          <div
            className={styles.errorBanner}
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <span style={{ color: '#991b1b', fontSize: '14px' }}>
              {error.status === 401 || /UNAUTHORIZED|No session/i.test(error.message)
                ? 'Sessione scaduta o non autenticato. '
                : error.message}
            </span>
            {error.status === 401 || /UNAUTHORIZED|No session/i.test(error.message) ? (
              <Link
                href="/instructor/login"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #f87171',
                  background: '#fff',
                  color: '#991b1b',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Accedi
              </Link>
            ) : onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #f87171',
                  background: '#fff',
                  color: '#991b1b',
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
          onToggle={() => setAutomationOn((v) => !v)}
          kpis={kpiTiles}
          integrations={integrations}
        />
      </section>

      <section className={styles.gridSection}>
        <div className={styles.threeCol}>
          {error ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
              Riprova sopra per caricare le conversazioni.
            </div>
          ) : loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              Loading live data…
            </div>
          ) : empty ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
              No conversations yet
            </div>
          ) : (
            <HotLeadsCard leads={leads} />
          )}
          {!error && loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
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
            emptyMessage="Not enough data"
            primaryLabel="Create test booking"
            secondaryLabel="Open Inbox"
            secondaryHref="/instructor/inbox"
          />
        </div>
      </section>
    </div>
  );
}

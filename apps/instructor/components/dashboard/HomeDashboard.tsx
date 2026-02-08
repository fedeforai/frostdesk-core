'use client';

import { useState } from 'react';
import AppShell from '@/components/shell/AppShell';
import StatusPill from '@/components/shared/StatusPill';
import { useApiHealth } from '@/components/shared/useApiHealth';
import AutomationCard from './cards/AutomationCard';
import HotLeadsCard from './cards/HotLeadsCard';
import ConversationCard from './cards/ConversationCard';
import FunnelCard from './cards/FunnelCard';
import type { Lead } from './cards/HotLeadsCard';
import type { Conversation } from './cards/ConversationCard';
import styles from './dashboard.module.css';

const HEALTH_URL = 'http://127.0.0.1:3001/health';

const MOCK_INTEGRATIONS = [
  { name: 'FrostDesk switch', status: 'Connected' },
  { name: 'Google Calendar', status: 'Connected' },
];

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
  const kpiTiles = kpiTilesProp;

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
    <AppShell>
      <div className={styles.topbar}>
        <div className={styles.title}>Automation switch</div>
        <div className={styles.right}>
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
            <span style={{ color: '#991b1b', fontSize: '14px' }}>{error.message}</span>
            {onRetry && (
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
            )}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <AutomationCard
          automationOn={automationOn}
          onToggle={() => setAutomationOn((v) => !v)}
          kpis={kpiTiles}
          integrations={MOCK_INTEGRATIONS}
        />
      </section>

      <section className={styles.gridSection}>
        <div className={styles.threeCol}>
          {loading ? (
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
          {loading ? (
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
    </AppShell>
  );
}

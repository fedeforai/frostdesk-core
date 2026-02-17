'use client';

import { useState } from 'react';
import AppShell from '@/components/shell/AppShell';
import StatusPill from '@/components/shared/StatusPill';
import { useApiHealth } from '@/components/shared/useApiHealth';
import { useKpis } from '@/components/shared/useKpis';
import AutomationCard from './cards/AutomationCard';
import HotLeadsCard from './cards/HotLeadsCard';
import ConversationCard from './cards/ConversationCard';
import FunnelCard from './cards/FunnelCard';
import styles from './dashboard.module.css';

// Mock data – replace with API later
const MOCK_LEADS = [
  { name: 'fede', tag: 'Ski school', status: 'Needs Reply' },
  { name: 'Battista', tag: 'Private lesson', status: 'Needs Reply' },
] as const;

const MOCK_CONVERSATION = {
  leadName: 'fede',
  meta: 'Ski school · Last message 2h ago',
  lastMessage: 'Hi, I’d like to book a lesson for next week. Can you confirm availability?',
};

const MOCK_KPIS_BASE = [
  { value: 3, label: 'Active requests' },
  { value: 2, label: 'Needs attention' },
  { value: 0, label: 'Manual override' },
];

const MOCK_INTEGRATIONS = [
  { name: 'FrostDesk switch', status: 'Connected' },
  { name: 'Google Calendar', status: 'Connected' },
];

/** Same-origin proxy; browser never calls 3001 directly (CORS). */
const HEALTH_URL = '/api/health';

export default function HomeDashboard() {
  const health = useApiHealth(HEALTH_URL);
  const kpis = useKpis();
  const [automationOn, setAutomationOn] = useState(true);

  const kpisWithDraftUsed = [
    ...MOCK_KPIS_BASE,
    { value: kpis.draftUsed, label: 'Draft used' },
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
    <AppShell>
      <div className={styles.topbar}>
        <div className={styles.title}>Automation switch</div>
        <div className={styles.right}>
          <StatusPill label={pillLabel} tone={pillTone} />
        </div>
      </div>

      <section className={styles.section}>
        <AutomationCard
          automationOn={automationOn}
          onToggle={() => setAutomationOn((v) => !v)}
          kpis={kpisWithDraftUsed}
          integrations={MOCK_INTEGRATIONS}
        />
      </section>

      <section className={styles.gridSection}>
        <div className={styles.threeCol}>
          <HotLeadsCard leads={[...MOCK_LEADS]} />
          <ConversationCard conversation={MOCK_CONVERSATION} />
          <FunnelCard
            emptyMessage="Not enough data"
            primaryLabel="Create test booking"
            secondaryLabel="Open Hot Leads"
          />
        </div>
      </section>
    </AppShell>
  );
}

'use client';

import { useState } from 'react';
import type { KpiWindow } from '@/lib/instructorApi';
import WindowSelector from './WindowSelector';
import BusinessKpiGrid from './BusinessKpiGrid';
import RevenueTrendCard from './RevenueTrendCard';
import FunnelMiniCard from './FunnelMiniCard';
import styles from './business.module.css';

export default function BusinessDashboardSection() {
  const [window, setWindow] = useState<KpiWindow>('30d');

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Business Intelligence</h2>
        <WindowSelector value={window} onChange={setWindow} />
      </div>

      <BusinessKpiGrid window={window} />

      <div className={styles.trendGrid}>
        <RevenueTrendCard window={window} />
        <FunnelMiniCard window={window} />
      </div>
    </div>
  );
}

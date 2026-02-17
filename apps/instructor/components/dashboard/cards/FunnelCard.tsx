'use client';

import Link from 'next/link';
import type { FunnelKpiResponse } from '@/lib/instructorApi';
import base from './card.module.css';
import styles from './FunnelCard.module.css';

const hasFunnelData = (f: FunnelKpiResponse | null | undefined): boolean =>
  f != null && (f.created > 0 || f.confirmed > 0 || f.cancelled > 0 || f.declined > 0);

export default function FunnelCard({
  funnel,
  emptyMessage = 'Not enough data',
  primaryLabel = 'Create test booking',
  primaryHref,
  secondaryLabel = 'Open Hot Leads',
  secondaryHref,
}: {
  funnel?: FunnelKpiResponse | null;
  emptyMessage?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  const showFunnel = hasFunnelData(funnel);
  const windowLabel = funnel?.window ?? '7d';

  return (
    <div className={base.card}>
      <h3 className={base.cardTitle}>Funnel Summary ({windowLabel})</h3>
      {showFunnel && funnel ? (
        <div className={styles.body}>
          <div className={styles.row}>
            <span className={styles.label}>Created</span>
            <span className={styles.value}>{funnel.created}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Confirmed</span>
            <span className={styles.value}>{funnel.confirmed}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Cancelled</span>
            <span className={styles.value}>{funnel.cancelled}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Declined</span>
            <span className={styles.value}>{funnel.declined}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Conversion rate</span>
            <span className={styles.value}>{Math.round(funnel.conversion_rate * 100)}%</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Cancellation rate</span>
            <span className={styles.value}>{Math.round(funnel.cancellation_rate * 100)}%</span>
          </div>
        </div>
      ) : (
        <div className={styles.empty}>{emptyMessage}</div>
      )}
      <div className={styles.actions}>
        {primaryHref ? (
          <Link href={primaryHref} className={`${styles.btn} ${styles.btnPrimary}`}>
            {primaryLabel}
          </Link>
        ) : (
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
            {primaryLabel}
          </button>
        )}
        {secondaryHref ? (
          <Link href={secondaryHref} className={styles.btn}>
            {secondaryLabel}
          </Link>
        ) : (
          <button type="button" className={styles.btn}>
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

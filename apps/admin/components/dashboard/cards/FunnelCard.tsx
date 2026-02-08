import base from './card.module.css';
import styles from './FunnelCard.module.css';

export default function FunnelCard({
  emptyMessage = 'Not enough data',
  primaryLabel = 'Create test booking',
  secondaryLabel = 'Open Hot Leads',
}: {
  emptyMessage?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className={base.card}>
      <h3 className={base.cardTitle}>Funnel Summary (7d)</h3>
      <div className={styles.empty}>{emptyMessage}</div>
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`}>
          {primaryLabel}
        </button>
        <button type="button" className={styles.btn}>
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

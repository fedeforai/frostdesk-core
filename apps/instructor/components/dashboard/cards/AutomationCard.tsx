import base from './card.module.css';
import styles from './AutomationCard.module.css';

export default function AutomationCard({
  automationOn,
  onToggle,
  kpis,
  integrations,
}: {
  automationOn: boolean;
  onToggle: () => void;
  kpis: Array<{ value: number | string; label: string }>;
  integrations: Array<{ name: string; status: string }>;
}) {
  return (
    <div className={`${base.card} ${styles.wrap}`}>
      <div className={styles.header}>
        <div className={`${styles.badge} ${automationOn ? styles.badgeOn : styles.badgeOff}`}>
          {automationOn ? 'ON' : 'OFF'}
        </div>
        <div className={styles.center}>
          <div className={styles.stateLabel}>
            Automation {automationOn ? 'ON' : 'OFF'}
          </div>
          <div className={styles.desc}>
            {automationOn
              ? 'AI is handling requests. Turn OFF to pause automation.'
              : 'Automation is paused. Turn ON to resume.'}
          </div>
        </div>
        <button
          type="button"
          className={`${styles.toggleBtn} ${automationOn ? styles.toggleOn : styles.toggleOff}`}
          onClick={onToggle}
        >
          {automationOn ? 'Turn OFF' : 'Turn ON'}
        </button>
      </div>

      <div className={styles.kpis}>
        {kpis.map((s) => (
          <div key={s.label} className={styles.kpi}>
            <div className={styles.kpiValue}>{s.value}</div>
            <div className={styles.kpiLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.integrations}>
        {integrations.map((i) => {
          const isConnected = i.status === 'Connected';
          const isChecking = i.status === 'Checking…';
          const checkClass = isConnected
            ? styles.integrationCheck
            : isChecking
              ? `${styles.integrationCheck} ${styles.warning}`
              : `${styles.integrationCheck} ${styles.muted}`;
          return (
            <div key={i.name} className={styles.integration}>
              <div className={checkClass} aria-hidden>{isConnected ? '✓' : isChecking ? '…' : '○'}</div>
              <div>
                <div className={styles.integrationName}>{i.name}</div>
                <div className={styles.integrationStatus}>{i.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

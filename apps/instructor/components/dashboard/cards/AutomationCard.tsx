import base from './card.module.css';
import styles from './AutomationCard.module.css';
import { useAppLocale } from '@/lib/app/AppLocaleContext';
import { getAppTranslations } from '@/lib/app/translations';

export default function AutomationCard({
  automationOn,
  onToggle,
  disabled = false,
  kpis,
  kpisLoaded = false,
  integrations,
}: {
  automationOn: boolean;
  onToggle: () => void;
  /** When true, the Turn ON/OFF button is disabled (e.g. while loading AI status). */
  disabled?: boolean;
  kpis: Array<{ value: number | string; label: string }>;
  /** When false, KPI cells show a loading state (skeleton) instead of values. */
  kpisLoaded?: boolean;
  integrations: Array<{ name: string; status: string }>;
}) {
  const { locale } = useAppLocale();
  const t = getAppTranslations(locale).dashboard;

  return (
    <div className={`${base.card} ${styles.wrap}`}>
      <div className={styles.header}>
        <div className={`${styles.badge} ${automationOn ? styles.badgeOn : styles.badgeOff}`}>
          {automationOn ? t.on : t.off}
        </div>
        <div className={styles.center}>
          <div className={styles.stateLabel} role="status" aria-live="polite">
            {automationOn ? t.automationOn : t.automationOff}
          </div>
          <div className={styles.desc}>
            {automationOn
              ? t.automationPauseHint
              : t.automationResumeHint}
          </div>
        </div>
        <button
          type="button"
          className={`${styles.toggleBtn} ${automationOn ? styles.toggleOn : styles.toggleOff}`}
          onClick={onToggle}
          disabled={disabled}
          aria-busy={disabled}
          aria-label={automationOn ? t.pauseAutomation : t.resumeAutomation}
        >
          {automationOn ? t.turnOff : t.turnOn}
        </button>
      </div>

      <div className={styles.kpis} role="region" aria-label={t.draftKpisLoading}>
        {kpis.map((s) => (
          <div key={s.label} className={styles.kpi}>
            {kpisLoaded ? (
              <div className={styles.kpiValue}>{s.value}</div>
            ) : (
              <div className={`${styles.kpiValue} ${styles.kpiValueSkeleton}`} aria-hidden>
                …
              </div>
            )}
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

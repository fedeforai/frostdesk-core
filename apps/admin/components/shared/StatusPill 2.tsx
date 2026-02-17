import styles from './statuspill.module.css';

export default function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: 'success' | 'danger' | 'muted';
}) {
  return (
    <span className={`${styles.pill} ${styles[tone]}`} aria-label={label}>
      <span className={styles.dot} />
      {label}
    </span>
  );
}

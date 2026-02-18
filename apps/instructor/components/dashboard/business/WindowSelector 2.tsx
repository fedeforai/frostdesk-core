'use client';

import type { KpiWindow } from '@/lib/instructorApi';
import styles from './business.module.css';

const WINDOWS: KpiWindow[] = ['7d', '30d', '90d'];

export default function WindowSelector({
  value,
  onChange,
}: {
  value: KpiWindow;
  onChange: (w: KpiWindow) => void;
}) {
  return (
    <div className={styles.windowSelector}>
      {WINDOWS.map((w) => (
        <button
          key={w}
          type="button"
          className={`${styles.windowBtn} ${w === value ? styles.windowBtnActive : ''}`}
          onClick={() => onChange(w)}
        >
          {w}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAppLocale } from '@/lib/app/AppLocaleContext';
import { getAppTranslations } from '@/lib/app/translations';
import type { KpiWindow, FunnelKpiResponse } from '@/lib/instructorApi';
import { getFunnelKpi } from '@/lib/instructorApi';
import styles from './business.module.css';

const BAR_COLORS: Record<string, string> = {
  Created: 'rgba(99,102,241,0.7)',
  Confirmed: 'rgba(34,197,94,0.7)',
  Completed: 'rgba(59,130,246,0.7)',
  Cancelled: 'rgba(239,68,68,0.5)',
};

export default function FunnelMiniCard({ window }: { window: KpiWindow }) {
  const [data, setData] = useState<FunnelKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { locale } = useAppLocale();
  const t = getAppTranslations(locale).dashboard;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getFunnelKpi(window)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  const bars = [
    { key: 'Created', label: t.created, value: data?.created ?? 0 },
    { key: 'Confirmed', label: t.confirmed, value: data?.confirmed ?? 0 },
    { key: 'Completed', label: t.completed, value: Math.round(((data?.conversion_rate ?? 0) / 100) * (data?.created ?? 0)) },
    { key: 'Cancelled', label: t.cancelled, value: data?.cancelled ?? 0 },
  ];

  const maxVal = Math.max(...bars.map((b) => b.value), 1);

  return (
    <div className={styles.trendCard}>
      <h4 className={styles.trendTitle}>{t.bookingFunnel}</h4>
      {loading ? (
        <div className={styles.kpiSkeleton} style={{ width: '100%', height: 80 }} />
      ) : (
        <div className={styles.funnelBars}>
          {bars.map((bar) => {
            const pct = Math.round((bar.value / maxVal) * 100);
            return (
              <div key={bar.key} className={styles.funnelBarCol}>
                <div
                  className={styles.funnelBar}
                  style={{
                    height: `${Math.max(pct, 5)}%`,
                    background: BAR_COLORS[bar.key] ?? 'rgba(148,163,184,0.4)',
                  }}
                />
                <span className={styles.funnelBarLabel}>{bar.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

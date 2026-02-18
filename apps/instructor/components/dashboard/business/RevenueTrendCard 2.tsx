'use client';

import { useState, useEffect } from 'react';
import type { KpiWindow, RevenueKpiResponse } from '@/lib/instructorApi';
import { getRevenueKpi } from '@/lib/instructorApi';
import styles from './business.module.css';

/**
 * Flat sparkline placeholder based on total revenue.
 * Since the endpoint does not provide time-series data, we generate a gentle
 * curve using the total as the visual anchor. No axes or grid — just a thin SVG line.
 */
function Sparkline({ value }: { value: number }) {
  const maxH = 44;
  const w = 280;
  // Generate a gentle fake curve with 8 points
  const points = 8;
  const baseline = value > 0 ? maxH * 0.3 : maxH * 0.8;
  const amplitude = value > 0 ? maxH * 0.35 : maxH * 0.05;
  const coords: string[] = [];

  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * w;
    // Gentle sine-like wave that ends higher if there is revenue
    const progress = i / (points - 1);
    const y =
      maxH -
      (baseline + amplitude * Math.sin(progress * Math.PI) * (0.6 + 0.4 * progress));
    coords.push(`${x},${y}`);
  }

  const gradientId = 'sparkGrad';
  const pathD = `M${coords.join(' L')}`;
  // Area fill: close path to bottom-right and bottom-left
  const areaD = `${pathD} L${w},${maxH} L0,${maxH} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${maxH}`}
      width="100%"
      height={maxH}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(99,102,241,0.25)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0)" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path d={pathD} fill="none" stroke="rgba(129,140,248,0.8)" strokeWidth="2" />
    </svg>
  );
}

function formatCurrency(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(euros);
}

export default function RevenueTrendCard({ window }: { window: KpiWindow }) {
  const [data, setData] = useState<RevenueKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRevenueKpi(window)
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

  const total = data?.total_revenue_cents ?? 0;

  return (
    <div className={styles.trendCard}>
      <h4 className={styles.trendTitle}>Revenue trend</h4>
      {loading ? (
        <div className={styles.kpiSkeleton} style={{ width: '100%', height: 48 }} />
      ) : (
        <>
          <p className={styles.kpiValue} style={{ fontSize: '1.25rem', marginBottom: 12 }}>
            {formatCurrency(total)}
          </p>
          <div className={styles.sparklineWrap}>
            <Sparkline value={total} />
          </div>
        </>
      )}
    </div>
  );
}

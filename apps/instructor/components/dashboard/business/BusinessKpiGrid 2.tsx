'use client';

import { useState, useEffect } from 'react';
import type { KpiWindow, BusinessKpiResponse } from '@/lib/instructorApi';
import { getBusinessKpi } from '@/lib/instructorApi';
import styles from './business.module.css';

function formatCurrency(cents: number): string {
  const euros = cents / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(euros);
}

function KpiCard({
  value,
  label,
  loading,
}: {
  value: string;
  label: string;
  loading: boolean;
}) {
  return (
    <div className={styles.kpiCard}>
      {loading ? (
        <div className={styles.kpiSkeleton} />
      ) : (
        <p className={styles.kpiValue}>{value}</p>
      )}
      <p className={styles.kpiLabel}>{label}</p>
    </div>
  );
}

export default function BusinessKpiGrid({ window }: { window: KpiWindow }) {
  const [data, setData] = useState<BusinessKpiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBusinessKpi(window)
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

  const revenue = data?.revenue_cents ?? 0;
  const paidBookings = data?.paid_bookings ?? 0;
  const avgValue = data?.avg_booking_value_cents ?? 0;
  const completedLessons = data?.completed_lessons ?? 0;
  const completionRate = data?.completion_rate ?? 0;
  const repeatRate = data?.repeat_customer_rate ?? 0;

  return (
    <div className={styles.kpiGrid}>
      <KpiCard value={formatCurrency(revenue)} label="Revenue" loading={loading} />
      <KpiCard value={String(paidBookings)} label="Paid bookings" loading={loading} />
      <KpiCard value={formatCurrency(avgValue)} label="Avg booking value" loading={loading} />
      <KpiCard value={String(completedLessons)} label="Completed lessons" loading={loading} />
      <KpiCard value={`${completionRate}%`} label="Completion rate" loading={loading} />
      <KpiCard value={`${repeatRate}%`} label="Repeat customer rate" loading={loading} />
    </div>
  );
}

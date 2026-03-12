'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAIQuota } from '@/lib/adminApi';
import { useAdminDashboard } from '@/components/admin/AdminDashboardContext';
import type { QuotaForPanel } from '@/components/admin/AdminDashboardContext';
import ErrorState from '@/components/admin/ErrorState';

interface AIQuotaPanelProps {
  className?: string;
  /** When provided, no fetch and no interval; display only. Otherwise uses dashboard context or single fetch. */
  quota?: QuotaForPanel | null;
}

export default function AIQuotaPanel({ className, quota: propsQuota }: AIQuotaPanelProps) {
  const dashboard = useAdminDashboard();
  const [localQuota, setLocalQuota] = useState<QuotaForPanel | null>(null);
  const [error, setError] = useState<{ status: number; message?: string } | null>(null);

  const fromContext = dashboard?.quotaForPanel;
  const quota = propsQuota ?? fromContext ?? localQuota;

  const load = useCallback(() => {
    fetchAIQuota()
      .then((data) => {
        if (data.ok && data.quota) {
          setLocalQuota(data.quota);
        } else {
          setError({ status: 500, message: 'Failed to fetch AI quota' });
        }
      })
      .catch((err: unknown) => {
        setError({
          status: (err as { status?: number })?.status || 500,
          message: (err as Error)?.message || 'Failed to fetch AI quota',
        });
      });
  }, []);

  useEffect(() => {
    if (propsQuota !== undefined || fromContext !== undefined) return;
    load();
  }, [load, propsQuota, fromContext]);

  if (error && !quota) {
    return <ErrorState status={error.status} message={error.message} />;
  }

  if (!quota) {
    return (
      <div style={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'rgba(226, 232, 240, 0.95)',
          }}>
            AI Quota
          </h2>
        </div>
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#6b7280',
          fontSize: '0.875rem',
        }}>
          NOT CONFIGURED
        </div>
      </div>
    );
  }

  const percentage = quota.max_allowed > 0
    ? Math.round((quota.used / quota.max_allowed) * 100)
    : 0;
  const isExceeded = quota.used >= quota.max_allowed;
  const status = isExceeded ? 'EXCEEDED' : 'OK';

  return (
    <div style={{
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.75rem',
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: 'rgba(226, 232, 240, 0.95)',
        }}>
          AI Quota
        </h2>
        <span style={{
          display: 'inline-block',
          padding: '0.375rem 0.75rem',
          borderRadius: '0.375rem',
          backgroundColor: isExceeded ? '#fee2e2' : '#d1fae5',
          color: isExceeded ? '#991b1b' : '#065f46',
          fontSize: '0.875rem',
          fontWeight: '500',
          border: `1px solid ${isExceeded ? '#fecaca' : '#a7f3d0'}`,
        }}>
          {status}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <span style={{ color: 'rgba(226, 232, 240, 0.95)', fontSize: '0.875rem', fontWeight: '500' }}>
            Channel
          </span>
          <span style={{ color: '#6b7280', fontSize: '0.875rem', textTransform: 'capitalize' }}>
            {quota.channel}
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <span style={{ color: 'rgba(226, 232, 240, 0.95)', fontSize: '0.875rem', fontWeight: '500' }}>
            Used / Max
          </span>
          <span style={{ color: '#6b7280', fontSize: '0.875rem', fontFamily: 'monospace' }}>
            {quota.used} / {quota.max_allowed}
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '0.375rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <span style={{ color: 'rgba(226, 232, 240, 0.95)', fontSize: '0.875rem', fontWeight: '500' }}>
            Percentage
          </span>
          <span style={{ color: '#6b7280', fontSize: '0.875rem', fontFamily: 'monospace' }}>
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
}

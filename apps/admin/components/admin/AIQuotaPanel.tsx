'use client';

import { useEffect, useState } from 'react';
import { fetchAIQuota } from '@/lib/adminApi';
import ErrorState from '@/components/admin/ErrorState';

interface AIQuotaPanelProps {
  className?: string;
}

export default function AIQuotaPanel({ className }: AIQuotaPanelProps) {
  const [quota, setQuota] = useState<{
    channel: string;
    period: string;
    max_allowed: number;
    used: number;
  } | null>(null);
  const [error, setError] = useState<{ status: number; message?: string } | null>(null);

  useEffect(() => {
    fetchAIQuota()
      .then((data) => {
        if (data.ok) {
          setQuota(data.quota);
        } else {
          setError({ status: 500, message: 'Failed to fetch AI quota' });
        }
      })
      .catch((err: any) => {
        setError({ 
          status: err.status || 500, 
          message: err.message || 'Failed to fetch AI quota' 
        });
      });
  }, []);

  if (error) {
    return <ErrorState status={error.status} message={error.message} />;
  }

  if (!quota) {
    return (
      <div style={{ 
        border: '1px solid #e5e7eb', 
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
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '0.75rem',
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: '#111827',
          }}>
            AI Quota
          </h2>
        </div>
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
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
      border: '1px solid #e5e7eb', 
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
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '0.75rem',
      }}>
        <h2 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600',
          color: '#111827',
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
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
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
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
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
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb',
        }}>
          <span style={{ color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>
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

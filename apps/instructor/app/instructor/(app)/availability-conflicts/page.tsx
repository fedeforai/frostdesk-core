'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchAvailabilityConflicts,
  type AvailabilityCalendarConflict,
} from '@/lib/instructorApi';
import AvailabilityConflictTable from '@/components/AvailabilityConflictTable';

export default function AvailabilityConflictsPage() {
  const router = useRouter();
  const [conflicts, setConflicts] = useState<AvailabilityCalendarConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvailabilityConflicts();
      setConflicts(data);
    } catch (err: any) {
      const status = err.status || 500;

      // 401 → redirect to login
      if (status === 401) {
        router.push('/instructor/login');
        return;
      }

      // 403 → static "Not authorized"
      if (status === 403) {
        setError('Not authorized');
        return;
      }

      // Any other error (500, 502, network): show page with empty list + actionable message
      setConflicts([]);
      setError('Conflicts could not be loaded. Start the API (pnpm --filter @frostdesk/api dev), then click Retry.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && conflicts.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Availability Conflicts
      </h1>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#991b1b',
        }}>
          <span>
            {error}
          </span>
          <button
            type="button"
            onClick={() => void loadConflicts()}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #f87171',
              background: '#fff',
              color: '#991b1b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <AvailabilityConflictTable conflicts={conflicts} />
      </div>
    </div>
  );
}

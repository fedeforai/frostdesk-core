'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAvailability, deactivateAvailability, fetchAvailabilityOverrides, fetchInstructorMeetingPoints } from '@/lib/instructorApi';
import type { InstructorAvailability } from '@/lib/instructorApi';
import AvailabilityTable from '@/components/AvailabilityTable';
import AvailabilityForm from '@/components/AvailabilityForm';
import AvailabilityCalendarView from '@/components/AvailabilityCalendarView';
import AvailabilityOverridesSection from '@/components/AvailabilityOverridesSection';

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<InstructorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAvailability, setEditingAvailability] = useState<InstructorAvailability | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarOverrides, setCalendarOverrides] = useState<Awaited<ReturnType<typeof fetchAvailabilityOverrides>>>([]);
  const [meetingPoints, setMeetingPoints] = useState<Awaited<ReturnType<typeof fetchInstructorMeetingPoints>>>([]);

  useEffect(() => {
    loadAvailability();
    fetchInstructorMeetingPoints().then(setMeetingPoints).catch(() => setMeetingPoints([]));
  }, []);

  useEffect(() => {
    if (viewMode !== 'calendar') return;
    const from = new Date();
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    fetchAvailabilityOverrides({ from: from.toISOString(), to: to.toISOString() })
      .then(setCalendarOverrides)
      .catch(() => setCalendarOverrides([]));
  }, [viewMode]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvailability();
      setAvailability(data);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const status = e?.status;
      const raw = e?.message ?? 'Unable to load availability';
      if (status === 401 || /UNAUTHORIZED|No session/i.test(raw)) {
        setError('UNAUTHORIZED');
        return;
      }
      if (status === 403) {
        setError(raw || 'Non autorizzato');
        return;
      }
      if (status === 404) {
        setError(raw || 'Profilo non trovato');
        return;
      }
      const isConnectionError =
        /Failed to fetch|Load failed|NetworkError|Unable to load|failed.*availability|availability.*failed|load availability|FAILED_TO_LOAD/i.test(raw) ||
        (/\bavailability\b/i.test(raw) && /\b(fail|error|load)\b/i.test(raw));
      const msg = isConnectionError
        ? 'Connection failed. Verify that the API is running (e.g. port 3001) and retry.'
        : raw;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InstructorAvailability) => {
    setEditingAvailability(item);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingAvailability(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAvailability(null);
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  const handleDeactivate = async (item: InstructorAvailability) => {
    try {
      await deactivateAvailability(item.id);
      window.location.reload();
    } catch (err: unknown) {
      setError((err as Error)?.message || 'Unable to deactivate availability');
    }
  };

  if (loading && availability.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(148, 163, 184, 0.92)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Availability
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '0.25rem' }}>
        Set the days and time slots when you can teach. Bookings will only be offered in these windows.
      </p>
      <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.75)', marginBottom: '1.5rem' }}>
        These windows repeat every week.
      </p>

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(185, 28, 28, 0.2)',
          border: '1px solid rgba(248, 113, 113, 0.5)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#fca5a5',
        }}>
          <span>
            {error === 'UNAUTHORIZED' ? (
              <>Session expired or not authenticated. <Link href="/instructor/login" style={{ color: '#7dd3fc', textDecoration: 'underline' }}>Login</Link></>
            ) : (
              error
            )}
          </span>
          {error !== 'UNAUTHORIZED' && (
          <button
            type="button"
            onClick={() => void loadAvailability()}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: 6,
              border: '1px solid rgba(248, 113, 113, 0.6)',
              background: 'transparent',
              color: '#fca5a5',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8125rem',
            }}
          >
            Retry
          </button>
          )}
        </div>
      )}

      {showAddForm || editingAvailability ? (
        <div style={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
            {editingAvailability ? 'Edit Availability' : 'Add Availability'}
          </h2>
          <AvailabilityForm
            availability={editingAvailability}
            meetingPoints={meetingPoints}
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        </div>
      ) : (
        <div style={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: viewMode === 'table' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                color: 'rgba(226, 232, 240, 0.95)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: viewMode === 'calendar' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                color: 'rgba(226, 232, 240, 0.95)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Calendar
            </button>
          </div>
          {viewMode === 'table' ? (
            <AvailabilityTable
              availability={availability}
              meetingPoints={meetingPoints}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              onAdd={handleAdd}
            />
          ) : (
            <AvailabilityCalendarView availability={availability} overrides={calendarOverrides} />
          )}
        </div>
      )}

      <AvailabilityOverridesSection />
    </div>
  );
}

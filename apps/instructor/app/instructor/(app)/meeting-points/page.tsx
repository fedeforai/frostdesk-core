'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchInstructorMeetingPoints } from '@/lib/instructorApi';
import type { InstructorMeetingPoint } from '@/lib/instructorApi';
import MeetingPointsTable from '@/components/MeetingPointsTable';
import MeetingPointForm from '@/components/MeetingPointForm';

export default function MeetingPointsPage() {
  const [meetingPoints, setMeetingPoints] = useState<InstructorMeetingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMeetingPoint, setEditingMeetingPoint] = useState<InstructorMeetingPoint | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadMeetingPoints();
  }, []);

  const loadMeetingPoints = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchInstructorMeetingPoints();
      setMeetingPoints(data);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const status = e?.status;
      const raw = e?.message ?? 'Unable to load meeting points';
      if (status === 401 || /UNAUTHORIZED|No session/i.test(raw)) {
        setError('UNAUTHORIZED');
        setMeetingPoints([]);
        return;
      }
      if (status === 403) {
        setError(raw || 'Non autorizzato');
        setMeetingPoints([]);
        return;
      }
      setMeetingPoints([]);
      const isConnectionError =
        /Failed to fetch|Load failed|NetworkError|meeting point|meeting points|could not be loaded/i.test(raw);
      setError(isConnectionError
        ? 'Connection failed. Verify that the API is running (e.g. port 3001) and retry.'
        : raw);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (meetingPoint: InstructorMeetingPoint) => {
    setEditingMeetingPoint(meetingPoint);
    setShowAddForm(false);
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingMeetingPoint(null);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingMeetingPoint(null);
  };

  const handleSuccess = () => {
    window.location.reload();
  };

  if (loading && meetingPoints.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(148, 163, 184, 0.92)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
        Meeting Points
      </h1>
      <p style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.92)', marginBottom: '1.5rem' }}>
        Meeting points for your lessons.
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
            onClick={() => void loadMeetingPoints()}
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

      {showAddForm || editingMeetingPoint ? (
        <div style={{
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1rem' }}>
            {editingMeetingPoint ? 'Edit Meeting Point' : 'Add Meeting Point'}
          </h2>
          <MeetingPointForm
            meetingPoint={editingMeetingPoint}
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
          <MeetingPointsTable
            meetingPoints={meetingPoints}
            onEdit={handleEdit}
            onAdd={handleAdd}
          />
        </div>
      )}
    </div>
  );
}

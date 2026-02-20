'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchCalendarEvents,
  type CalendarEvent,
  type InstructorCalendarConnection,
} from '@/lib/instructorApi';
import CalendarConnectionPanel from '@/components/CalendarConnectionPanel';
import CalendarEventsTable from '@/components/CalendarEventsTable';

export default function CalendarPage() {
  const router = useRouter();
  const [connection, setConnection] = useState<InstructorCalendarConnection | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch events - if successful, we have a connection
      // If it fails with specific error, we don't have a connection
      try {
        const eventsData = await fetchCalendarEvents();
        setEvents(eventsData);
        
        // If we can fetch events, we have a connection
        // Note: We don't have connection details (provider/calendar_id) without a GET endpoint
        // Connection details will be shown after connecting (stored in state)
        // For now, we'll use a placeholder to indicate connection exists
        if (!connection) {
          // Connection exists but we don't have details - will be shown after connect
          setConnection({
            id: '',
            provider: 'google',
            calendar_id: '',
            expires_at: null,
            created_at: '',
            updated_at: '',
          });
        }
      } catch (fetchErr: any) {
        const status = fetchErr.status || 500;
        if (status === 400) {
          // No connection
          setConnection(null);
          setEvents([]);
        } else {
          throw fetchErr;
        }
      }
    } catch (err: any) {
      const status = err.status || 500;

      // 401 → redirect to login
      if (status === 401) {
        router.push('/login');
        return;
      }

      // 403 → static "Not authorized"
      if (status === 403) {
        setError('Not authorized');
        return;
      }

      // 500 → static error
      setError('Unable to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionChange = (newConnection?: InstructorCalendarConnection | null) => {
    // Update connection state if provided (including null for disconnect)
    if (newConnection !== undefined) {
      setConnection(newConnection);
    }
    // Reload data after connection changes
    loadData();
  };

  if (loading && connection === null && events.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Calendar
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
            {error === 'Not authorized' ? 'Not authorized' : "Couldn't load calendar data. Check your connection and retry."}
          </span>
          <button
            type="button"
            onClick={() => void loadData()}
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

      <CalendarConnectionPanel
        connection={connection}
        onConnectionChange={handleConnectionChange}
      />

      {connection && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <CalendarEventsTable events={events} />
        </div>
      )}
    </div>
  );
}

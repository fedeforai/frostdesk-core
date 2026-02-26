'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchCalendarConnection,
  fetchCalendarEvents,
  type CalendarEvent,
  type InstructorCalendarConnection,
} from '@/lib/instructorApi';
import CalendarConnectionPanel from '@/components/CalendarConnectionPanel';
import CalendarEventsTable from '@/components/CalendarEventsTable';

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<InstructorCalendarConnection | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const errParam = searchParams.get('error');
    if (connected === '1') {
      setOauthMessage({ type: 'success', text: 'Calendar connected.' });
      window.history.replaceState({}, '', '/instructor/calendar');
    } else if (errParam) {
      setOauthMessage({ type: 'error', text: errParam === 'access_denied' ? 'Autorizzazione annullata.' : decodeURIComponent(errParam) });
      window.history.replaceState({}, '', '/instructor/calendar');
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const conn = await fetchCalendarConnection();
      setConnection(conn);
      if (conn) {
        try {
          const eventsData = await fetchCalendarEvents();
          setEvents(eventsData);
        } catch {
          setEvents([]);
        }
      } else {
        setEvents([]);
      }
    } catch (err: any) {
      const status = err.status || 500;
      if (status === 401) {
        router.push('/login');
        return;
      }
      if (status === 403) {
        setError('Not authorized');
        return;
      }
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

      {oauthMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: oauthMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${oauthMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: oauthMessage.type === 'success' ? '#166534' : '#991b1b',
        }}>
          {oauthMessage.text}
        </div>
      )}

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

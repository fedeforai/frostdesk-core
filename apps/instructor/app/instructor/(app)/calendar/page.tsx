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
import EventConstellationCalendar from '@/components/EventConstellationCalendar';

const VIEW_STORAGE_KEY = 'instructor_calendar_view';
type ViewMode = 'table' | 'constellation';

function getStoredView(): ViewMode {
  if (typeof window === 'undefined') return 'table';
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY);
    if (v === 'table' || v === 'constellation') return v;
  } catch {
    // ignore
  }
  return 'table';
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<InstructorCalendarConnection | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  useEffect(() => {
    setViewMode(getStoredView());
  }, []);

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
        router.push('/instructor/login');
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
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }} role="tablist" aria-label="Calendar view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'table'}
              onClick={() => {
                setViewMode('table');
                try {
                  localStorage.setItem(VIEW_STORAGE_KEY, 'table');
                } catch {
                  // ignore
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: viewMode === 'table' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: 'rgba(226, 232, 240, 0.95)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Table
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'constellation'}
              onClick={() => {
                setViewMode('constellation');
                try {
                  localStorage.setItem(VIEW_STORAGE_KEY, 'constellation');
                } catch {
                  // ignore
                }
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: viewMode === 'constellation' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: 'rgba(226, 232, 240, 0.95)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Constellation
            </button>
          </div>
          <div style={{
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}>
            {viewMode === 'table' ? (
              <CalendarEventsTable events={events} />
            ) : (
              <EventConstellationCalendar events={events} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

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

  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            lineHeight: '1',
          }}>
            ⚠️
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem',
          }}>
            {error === 'Not authorized' ? 'Not authorized' : 'Unable to load calendar data'}
          </h2>
          {error !== 'Not authorized' && (
            <p style={{ color: '#6b7280' }}>
              An error occurred while loading calendar data. Please try again later.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Calendar
      </h1>

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

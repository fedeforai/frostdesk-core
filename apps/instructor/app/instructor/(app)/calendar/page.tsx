'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchCalendarConnection,
  fetchCalendarEvents,
  fetchInstructorBookings,
  fetchAvailabilityOverrides,
  type CalendarEvent,
  type InstructorCalendarConnection,
  type AvailabilityOverrideItem,
} from '@/lib/instructorApi';
import CalendarConnectionPanel from '@/components/CalendarConnectionPanel';
import MonthCalendarView, { type CalendarItem } from '@/components/MonthCalendarView';

function getMonthDateRange(year: number, month: number): { from: string; to: string } {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0],
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<InstructorCalendarConnection | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<AvailabilityOverrideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

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

  const loadData = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const conn = await fetchCalendarConnection();
      setConnection(conn);
      
      const { from, to } = getMonthDateRange(year, month);
      
      const [eventsData, bookingsData, overridesData] = await Promise.all([
        conn ? fetchCalendarEvents({ dateFrom: from, dateTo: to }).catch(() => []) : Promise.resolve([]),
        fetchInstructorBookings({ date_from: from, date_to: to }).catch(() => ({ items: [] })),
        fetchAvailabilityOverrides({ from, to }).catch(() => []),
      ]);
      
      setCalendarEvents(eventsData);
      setBookings(bookingsData.items || []);
      setOverrides(overridesData);
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
  }, [router]);

  useEffect(() => {
    loadData(currentYear, currentMonth);
  }, [loadData, currentYear, currentMonth]);

  const handleConnectionChange = (newConnection?: InstructorCalendarConnection | null) => {
    if (newConnection !== undefined) {
      setConnection(newConnection);
    }
    loadData(currentYear, currentMonth);
  };

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const calendarBookings: CalendarItem[] = useMemo(() => {
    return bookings.map(b => ({
      id: b.id,
      type: b.status === 'confirmed' || b.status === 'modified' ? 'booking-confirmed' : 'booking-pending',
      title: b.customer_name || b.customer_display_name || 'Booking',
      startTime: b.start_time,
      endTime: b.end_time,
      customerName: b.customer_name || b.customer_display_name,
    }));
  }, [bookings]);

  const googleEvents: CalendarItem[] = useMemo(() => {
    return calendarEvents.map(e => ({
      id: e.id,
      type: 'google-event' as const,
      title: e.title || 'Google Event',
      startTime: e.start_at,
      endTime: e.end_at,
    }));
  }, [calendarEvents]);

  const blockedSlots: CalendarItem[] = useMemo(() => {
    return overrides
      .filter(o => !o.is_available)
      .map(o => ({
        id: o.id,
        type: 'blocked' as const,
        title: 'Blocked',
        startTime: o.start_utc,
        endTime: o.end_utc,
      }));
  }, [overrides]);

  const availableSlots: CalendarItem[] = useMemo(() => {
    return overrides
      .filter(o => o.is_available)
      .map(o => ({
        id: o.id,
        type: 'available' as const,
        title: 'Extra Availability',
        startTime: o.start_utc,
        endTime: o.end_utc,
      }));
  }, [overrides]);

  if (loading && connection === null && bookings.length === 0 && !error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: 'rgba(148, 163, 184, 0.8)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)', marginBottom: '1.5rem' }}>
        Calendar
      </h1>

      {oauthMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: oauthMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${oauthMessage.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: oauthMessage.type === 'success' ? '#4ade80' : '#f87171',
        }}>
          {oauthMessage.text}
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#f87171',
        }}>
          <span>
            {error === 'Not authorized' ? 'Not authorized' : "Couldn't load calendar data. Check your connection and retry."}
          </span>
          <button
            type="button"
            onClick={() => void loadData(currentYear, currentMonth)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
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

      <div style={{
        marginTop: '1.5rem',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
      }}>
        <MonthCalendarView
          bookings={calendarBookings}
          googleEvents={googleEvents}
          blockedSlots={blockedSlots}
          availableSlots={availableSlots}
          onMonthChange={handleMonthChange}
        />
      </div>

      <div style={{
        marginTop: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.75rem',
        color: 'rgba(148, 163, 184, 0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#22c55e' }} />
          Confirmed Booking
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#eab308' }} />
          Pending Booking
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#6b7280' }} />
          Google Calendar
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#ef4444' }} />
          Blocked
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
          Extra Availability
        </div>
      </div>
    </div>
  );
}

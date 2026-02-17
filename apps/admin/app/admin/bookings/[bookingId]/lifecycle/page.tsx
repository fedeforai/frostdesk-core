'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBookingLifecycle, type BookingLifecycleEvent } from '@/lib/adminApi';
import BookingLifecycleTimeline from '@/components/admin/BookingLifecycleTimeline';

export default function BookingLifecyclePage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const [events, setEvents] = useState<BookingLifecycleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchBookingLifecycle(bookingId);
      setEvents(data ?? []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setErrorMessage(e?.message ?? 'Failed to load lifecycle');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const backLink = (
    <Link
      href={`/admin/bookings/${bookingId}`}
      style={{
        color: '#3b82f6',
        textDecoration: 'none',
        fontSize: '0.875rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        marginBottom: '1rem',
      }}
    >
      ← Back to Booking
    </Link>
  );

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        {backLink}
        <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: 'rgba(226, 232, 240, 0.95)' }}>
          Booking Lifecycle: {bookingId}
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Loading lifecycle...</div>
      ) : errorMessage ? (
        <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {errorMessage}
          <br />
          <button type="button" onClick={load} style={{ marginTop: '0.5rem', padding: '0.375rem 0.75rem', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '0.375rem', background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8125rem' }}>
            Retry
          </button>
        </div>
      ) : (
        <BookingLifecycleTimeline events={events} />
      )}
    </div>
  );
}

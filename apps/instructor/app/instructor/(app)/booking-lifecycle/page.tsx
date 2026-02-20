'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { fetchInstructorBooking, fetchBookingTimeline } from '@/lib/instructorApi';
import type { BookingTimelineEventApi } from '@/lib/instructorApi';
import { BookingLifecycleHeader } from '@/components/bookings/BookingLifecycleHeader';
import { BookingLifecycleTimeline } from '@/components/bookings/BookingLifecycleTimeline';

/**
 * Booking Lifecycle page — read-only observability.
 *
 * Fetches:
 *   1. Booking detail (GET /instructor/bookings/:id)
 *   2. State transition timeline (GET /instructor/bookings/:id/timeline)
 *
 * Shows the booking header + chronological state changes (from → to).
 * No mutations, no side effects.
 */

export default function BookingLifecyclePage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<BookingTimelineEventApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const [bookingData, timelineData] = await Promise.all([
          fetchInstructorBooking(bookingId!),
          fetchBookingTimeline(bookingId!),
        ]);

        if (cancelled) return;

        // bookingData may be wrapped in { ok, booking } or be the booking directly
        const b = bookingData?.booking ?? bookingData;
        setBooking(b);
        setTimeline(timelineData.timeline ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        if (message === 'NOT_FOUND' || message === 'BOOKING_NOT_FOUND') {
          setNotFound(true);
        } else {
          setError(message || 'Impossibile caricare il booking.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [bookingId]);

  // ── No bookingId ──────────────────────────────────────────────────────────
  if (!bookingId) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={headingStyle}>Booking Lifecycle</h1>
        <p style={subtitleStyle}>
          Visualizza lo stato e la cronologia di un booking.
        </p>
        <p style={{ color: 'rgba(203, 213, 225, 0.92)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          Specifica un booking ID (es. dal link nella lista bookings).
        </p>
        <Link href="/instructor/bookings" style={linkBtnStyle}>
          Vai ai bookings
        </Link>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={headingStyle}>Booking Lifecycle</h1>
        <p style={{ color: 'rgba(148, 163, 184, 0.75)', fontSize: '0.875rem' }}>
          Caricamento…
        </p>
      </div>
    );
  }

  // ── Not Found ─────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={headingStyle}>Booking Lifecycle</h1>
        <p style={subtitleStyle}>Booking non trovato.</p>
        <Link href="/instructor/bookings" style={linkBtnStyle}>
          Vai ai bookings
        </Link>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={headingStyle}>Booking Lifecycle</h1>
        <div style={errorBannerStyle}>
          {error}{' '}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginLeft: 8,
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid rgba(248, 113, 113, 0.4)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              fontWeight: 600,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={headingStyle}>Booking Lifecycle</h1>
      <p style={subtitleStyle}>Stato e cronologia per il booking selezionato.</p>

      {booking && <BookingLifecycleHeader booking={booking} />}
      <BookingLifecycleTimeline timeline={timeline} />
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────────

const headingStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 800,
  color: 'rgba(226, 232, 240, 0.95)',
  marginBottom: '0.25rem',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: 'rgba(148, 163, 184, 0.92)',
  marginBottom: '1.5rem',
};

const linkBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.5rem 1rem',
  borderRadius: 6,
  backgroundColor: 'rgba(59, 130, 246, 0.2)',
  color: '#7dd3fc',
  fontWeight: 600,
  textDecoration: 'none',
  border: '1px solid rgba(59, 130, 246, 0.4)',
};

const errorBannerStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  marginBottom: '1.5rem',
  backgroundColor: 'rgba(185, 28, 28, 0.2)',
  border: '1px solid rgba(248, 113, 113, 0.5)',
  borderRadius: 8,
  fontSize: '0.875rem',
  color: '#fca5a5',
};

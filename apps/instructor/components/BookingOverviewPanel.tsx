'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * P2.1-T5 / T6 — Read-only Booking Overview Panel.
 * Loads the latest booking for the conversation (no status filter). No buttons, no CTAs, no mutations.
 */

export type ConversationBookingStatus = 'draft' | 'pending' | 'confirmed' | 'cancelled';

export interface BookingOverviewRow {
  id: string;
  conversation_id: string;
  instructor_id: string;
  status: ConversationBookingStatus | string;
  date: string | null;
  duration: string | null;
  participants: string | null;
  level: string | null;
  price_estimate?: string | number | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<
  ConversationBookingStatus,
  { label: string; bg: string; color: string }
> = {
  draft: { label: 'Draft (not sent)', bg: 'rgba(255, 255, 255, 0.1)', color: 'rgba(148, 163, 184, 0.9)' },
  pending: { label: 'Pending confirmation', bg: 'rgba(251, 191, 36, 0.2)', color: 'rgba(251, 191, 36, 0.95)' },
  confirmed: { label: 'Confirmed', bg: 'rgba(34, 197, 94, 0.2)', color: 'rgba(74, 222, 128, 0.95)' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.2)', color: 'rgba(248, 113, 113, 0.95)' },
};

/** STEP 5.1 — Descriptive copy for booking state (UI only). No copy for null or unknown. */
function getBookingStateCopy(state: string | null): string {
  switch (state) {
    case 'draft':
      return "Draft — you're preparing the proposal";
    case 'pending':
      return "Pending — waiting for customer confirmation";
    case 'confirmed':
      return "Confirmed — booking locked and ready for payment";
    case 'cancelled':
      return "Cancelled — no action required";
    default:
      return '';
  }
}

export function BookingOverviewPanel({ conversationId }: { conversationId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingOverviewRow | null>(null);

  function scrollToTimeline(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    document
      .getElementById('booking-timeline')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setBooking(null);
      try {
        const supabase = createClient();
        const { data, error: err } = await supabase
          .from('conversation_bookings')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (err) {
          setError(err.message ?? 'Failed to load booking');
          return;
        }
        setBooking(data as BookingOverviewRow | null);
      } catch {
        if (!cancelled) setError('Unable to load booking details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId]);

  if (loading) {
    return (
      <div
        style={{
          marginBottom: '0.75rem',
          padding: '0.5rem 0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.375rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          fontSize: '0.8125rem',
          color: 'rgba(148, 163, 184, 0.9)',
        }}
      >
        Loading booking…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          marginBottom: '0.75rem',
          padding: '0.5rem 0.75rem',
          border: '1px solid rgba(248, 113, 113, 0.5)',
          borderRadius: '0.375rem',
          backgroundColor: 'rgba(185, 28, 28, 0.2)',
          fontSize: '0.8125rem',
          color: '#fca5a5',
        }}
      >
        Unable to load booking details.
      </div>
    );
  }

  if (!booking) {
    return (
      <div
        style={{
          marginBottom: '0.75rem',
          padding: '0.5rem 0.75rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '0.375rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          fontSize: '0.8125rem',
          color: 'rgba(148, 163, 184, 0.9)',
        }}
      >
        No booking created yet.
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[booking.status as ConversationBookingStatus] ?? STATUS_CONFIG.draft;
  const empty = (v: string | null | undefined) => (v == null || String(v).trim() === '' ? '—' : String(v).trim());

  return (
    <section
      style={{
        marginBottom: '0.75rem',
        padding: '0.75rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.375rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        fontSize: '0.8125rem',
      }}
      aria-label="Booking overview"
    >
      <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'rgba(226, 232, 240, 0.95)', fontSize: '0.75rem', margin: 0 }}>
        Booking overview
      </h3>
      <div
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.5rem',
          paddingLeft: booking.status === 'confirmed' ? '0.5rem' : undefined,
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: '0.25rem',
          backgroundColor: booking.status === 'confirmed' ? 'rgba(34, 197, 94, 0.15)' : statusConf.bg,
          color: statusConf.color,
          marginBottom: '0.25rem',
          ...(booking.status === 'confirmed'
            ? { borderLeft: '3px solid rgba(74, 222, 128, 0.95)' }
            : {}),
        }}
      >
        {booking.status === 'confirmed' ? (
          <>
            <span style={{ color: 'rgba(74, 222, 128, 0.95)' }}>✓</span> {statusConf.label}
          </>
        ) : (
          statusConf.label
        )}
      </div>
      {getBookingStateCopy(booking.status) && (
        <p style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)' }}>
          {getBookingStateCopy(booking.status)}
        </p>
      )}
      {(booking.status === 'pending' || booking.status === 'draft') && (
        <div style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(148, 163, 184, 0.9)' }}>
            Reserved
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginTop: '0.25rem', lineHeight: 1.4 }}>
            This lesson is reserved, not finalized yet. You can confirm when ready; payment completion will finalize the booking.
          </div>
        </div>
      )}
      {booking.status === 'confirmed' && (
        <div style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', lineHeight: 1.4 }}>
            Confirmed — pending payment
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginTop: '0.25rem', lineHeight: 1.4 }}>
            Payment completion will finalize the booking.
          </div>
        </div>
      )}
      {booking.status === 'confirmed' && (
        <>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)' }}>
              What happens next
            </div>
            <div style={{ fontSize: '0.875rem', color: 'rgba(226, 232, 240, 0.85)' }}>
              You can now collect payment and add this booking to your calendar.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginTop: '0.25rem' }}>
              Payment and calendar sync are handled manually for now.
            </div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(148, 163, 184, 0.9)' }}>
              Payment
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              Payment is handled outside FrostDesk for now. You can collect payment directly and mark it as completed later.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginTop: '0.25rem', lineHeight: 1.4 }}>
              <div style={{ fontWeight: 600 }}>Payment status</div>
              <div style={{ marginTop: '0.25rem' }}>Not collected yet</div>
              <div style={{ marginTop: '0.25rem' }}>Payment status is shown here when available.</div>
            </div>
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', lineHeight: 1.4 }}>
            This lesson has been confirmed by the instructor. Payment completion will finalize the booking.
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'rgba(148, 163, 184, 0.75)', lineHeight: 1.4, marginTop: '0.5rem' }}>
            May be available with a subscription.
          </div>
        </>
      )}
      <div style={{ fontSize: '0.75rem', color: 'rgba(226, 232, 240, 0.85)' }}>
        <div>Dates: {empty(booking.date)}</div>
        <div>Duration: {empty(booking.duration)}</div>
        <div>Participants: {empty(booking.participants)}</div>
        <div>Level: {empty(booking.level)}</div>
      </div>
      <p style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.6875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
        Last updated: {new Date(booking.updated_at).toLocaleDateString()}
      </p>
      <p style={{ marginTop: '0.5rem', marginBottom: 0, fontSize: '0.6875rem', color: 'rgba(148, 163, 184, 0.75)', lineHeight: 1.4 }}>
        Available during pilot access
      </p>
      <div className="mt-3 text-sm">
        <a
          href="#booking-timeline"
          onClick={scrollToTimeline}
          className="text-blue-600 hover:underline"
        >
          View booking history →
        </a>
      </div>
    </section>
  );
}

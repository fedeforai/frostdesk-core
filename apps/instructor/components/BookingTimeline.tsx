'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuditRow = {
  id: string;
  booking_id: string;
  previous_state: string | null;
  new_state: string;
  actor: 'human' | 'system' | string;
  created_at: string;
};

interface BookingTimelineProps {
  conversationId: string;
}

function formatTimestamp(raw: string): string {
  try {
    const d = new Date(raw);
    return isNaN(d.getTime())
      ? '—'
      : d.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
  } catch {
    return '—';
  }
}

function formatState(state: string): string {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

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

function bulletColor(state: string): string {
  switch (state) {
    case 'confirmed':
      return 'rgba(74, 222, 128, 0.95)'; // green
    case 'pending':
      return 'rgba(251, 191, 36, 0.95)'; // amber
    case 'cancelled':
      return 'rgba(248, 113, 113, 0.95)'; // red
    default:
      return 'rgba(148, 163, 184, 0.9)'; // gray
  }
}

function groupByBooking(rows: AuditRow[]) {
  const map = new Map<string, AuditRow[]>();

  for (const row of rows) {
    if (!map.has(row.booking_id)) {
      map.set(row.booking_id, []);
    }
    map.get(row.booking_id)!.push(row);
  }

  return Array.from(map.entries());
}

export default function BookingTimeline({ conversationId }: BookingTimelineProps) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // --- Primary strategy: join audit → bookings ---
        const { data, error: joinError } = await supabase
          .from('conversation_booking_audit')
          .select(
            `
            id,
            booking_id,
            previous_state,
            new_state,
            actor,
            created_at,
            conversation_bookings!inner(conversation_id)
          `
          )
          .eq('conversation_bookings.conversation_id', conversationId)
          .order('created_at', { ascending: false });

        if (!joinError && data) {
          if (!cancelled) setRows(data as AuditRow[]);
          return;
        }

        // --- Fallback: two-step (safe & explicit) ---
        const { data: bookings } = await supabase
          .from('conversation_bookings')
          .select('id')
          .eq('conversation_id', conversationId);

        const bookingIds = (bookings ?? []).map((b) => b.id);
        if (bookingIds.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }

        const { data: auditRows, error: auditError } = await supabase
          .from('conversation_booking_audit')
          .select('id, booking_id, previous_state, new_state, actor, created_at')
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: false });

        if (auditError) throw auditError;
        if (!cancelled) setRows(auditRows as AuditRow[]);
      } catch (err: unknown) {
        if (!cancelled) setError('Unable to load booking history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (loading) {
    return (
      <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
        Loading booking history…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontSize: '0.875rem', color: '#fca5a5' }}>
        {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ fontSize: '0.875rem', color: 'rgba(148, 163, 184, 0.9)' }}>
        No booking history yet.
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'rgba(226, 232, 240, 0.95)' }}>
        Booking history
      </h3>
      <p style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.75rem' }}>
        Read-only · Audit trail
      </p>

      {groupByBooking(rows).map(([bookingId, events], index) => {
        const latest = events[0];
        const finalState = formatState(latest.new_state);

        return (
          <div key={bookingId} style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'rgba(226, 232, 240, 0.95)',
                marginBottom: '0.25rem',
              }}
            >
              {latest.new_state === 'confirmed' && (
                <span style={{ color: 'rgba(74, 222, 128, 0.95)', marginRight: '0.25rem' }}>✓</span>
              )}
              Booking {index + 1} · {finalState}
            </div>
            {getBookingStateCopy(latest.new_state) && (
              <p style={{ margin: 0, marginBottom: '0.25rem', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                {getBookingStateCopy(latest.new_state)}
              </p>
            )}

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {events.map((row) => {
                const label =
                  row.previous_state === null
                    ? 'Draft created'
                    : `Status changed: ${formatState(row.previous_state)} → ${formatState(row.new_state)}`;

                return (
                  <li
                    key={row.id}
                    style={{
                      display: 'flex',
                      gap: '0.4rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        color: bulletColor(row.new_state),
                        lineHeight: '1.2',
                      }}
                    >
                      ●
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(226, 232, 240, 0.85)' }}>
                      <div>{formatTimestamp(row.created_at)}</div>
                      <div>{label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                        Actor: {row.actor === 'human' ? 'Human' : row.actor}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

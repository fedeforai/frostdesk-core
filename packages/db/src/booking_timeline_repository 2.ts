/**
 * Loop 6: Booking-centric decision timeline (READ-ONLY).
 * Source: booking_audit only. No inference.
 */

import { sql } from './client.js';

export interface BookingTimelineEvent {
  timestamp: string;
  type: 'booking_state_change';
  from: string;
  to: string;
  actor_type: 'human' | 'system';
  reason?: string | null;
}

/**
 * Builds chronological timeline for a booking from booking_audit.
 * Read-only; no inference.
 */
export async function getBookingTimeline(
  bookingId: string
): Promise<BookingTimelineEvent[]> {
  const rows = await sql<{
    previous_state: string | null;
    new_state: string | null;
    actor: string;
    created_at: string;
    event_type: string | null;
  }[]>`
    SELECT previous_state, new_state, actor, created_at, event_type
    FROM booking_audit
    WHERE booking_id = ${bookingId}
    ORDER BY created_at ASC
  `;

  return rows.map((r) => ({
    timestamp: r.created_at,
    type: 'booking_state_change' as const,
    from: r.previous_state ?? '',
    to: r.new_state ?? '',
    actor_type: (r.actor === 'human' ? 'human' : 'system') as 'human' | 'system',
    reason: r.event_type ?? null,
  }));
}

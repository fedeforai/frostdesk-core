import { sql } from './client.js';
import { BookingNotFoundError } from './booking_repository.js';

/**
 * Booking lifecycle event types.
 */
export type BookingLifecycleEventType = 'booking_created' | 'manual_override' | 'status_transition';

/**
 * A single event in the booking lifecycle timeline.
 */
export interface BookingLifecycleEvent {
  type: BookingLifecycleEventType;
  actor: string;
  from: string | null;
  to: string | null;
  timestamp: string; // ISO timestamp string
}

/**
 * Retrieves the complete lifecycle timeline for a booking.
 * 
 * WHAT IT DOES:
 * - Reads booking creation from bookings table
 * - Reads all audit entries from booking_audit table
 * - Merges and orders chronologically
 * 
 * WHAT IT DOES NOT DO:
 * - No mutations
 * - No side effects
 * - No pagination
 * 
 * @param bookingId - UUID of the booking
 * @returns Array of lifecycle events ordered by timestamp ASC
 * @throws BookingNotFoundError if booking does not exist
 */
export async function getBookingLifecycle(
  bookingId: string
): Promise<BookingLifecycleEvent[]> {
  const events: BookingLifecycleEvent[] = [];

  // 1. Fetch booking creation record
  const bookingResult = await sql<Array<{
    id: string;
    status: string;
    created_at: string;
  }>>`
    SELECT id, status, created_at
    FROM bookings
    WHERE id = ${bookingId}
    LIMIT 1
  `;

  if (bookingResult.length === 0) {
    throw new BookingNotFoundError(bookingId);
  }

  const booking = bookingResult[0];

  // 2. Add booking_created event
  events.push({
    type: 'booking_created',
    actor: 'system',
    from: null,
    to: booking.status,
    timestamp: booking.created_at,
  });

  // 3. Fetch all audit entries for this booking
  const auditResult = await sql<Array<{
    booking_id: string;
    previous_state: string | null;
    new_state: string | null;
    from_status: string | null;
    to_status: string | null;
    actor: string;
    created_at: string;
  }>>`
    SELECT 
      booking_id,
      previous_state,
      new_state,
      from_status,
      to_status,
      actor,
      created_at
    FROM booking_audit
    WHERE booking_id = ${bookingId}
    ORDER BY created_at ASC
  `;

  // 4. Map audit entries to lifecycle events
  for (const audit of auditResult) {
    // Determine event type according to rules
    let eventType: BookingLifecycleEventType;
    
    // Rule: manual_override if actor='human' AND has state change
    const hasStateChange = 
      (audit.previous_state !== null && audit.new_state !== null) ||
      (audit.from_status !== null && audit.to_status !== null);
    
    if (audit.actor === 'human' && hasStateChange) {
      eventType = 'manual_override';
    } else {
      eventType = 'status_transition';
    }

    // Map from/to: prefer previous_state/new_state, fallback to from_status/to_status
    const fromValue = audit.previous_state ?? audit.from_status ?? null;
    const toValue = audit.new_state ?? audit.to_status ?? null;

    events.push({
      type: eventType,
      actor: audit.actor,
      from: fromValue,
      to: toValue,
      timestamp: audit.created_at,
    });
  }

  // 5. Explicit ordering by timestamp ASC (safeguard)
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

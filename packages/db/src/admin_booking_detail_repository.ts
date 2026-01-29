import { sql } from './client.js';
import { BookingState } from './booking_state_machine.js';

export interface AdminBookingDetail {
  id: string;
  instructor_id: number;
  customer_name: string;
  phone: string;
  status: BookingState;
  booking_date: string;
  start_time: string;
  end_time: string;
  calendar_event_id: string | null;
  payment_intent_id: string | null;
  conversation_id: string | null;
  created_at: string;
}

export interface BookingAuditEntry {
  id: string;
  booking_id: string;
  previous_state: BookingState;
  new_state: BookingState;
  actor: 'system' | 'human';
  created_at: string;
}

/**
 * Retrieves a booking by ID (read-only).
 * 
 * @param bookingId - Booking ID
 * @returns Booking details or null if not found
 */
export async function getBookingById(bookingId: string): Promise<AdminBookingDetail | null> {
  const result = await sql<AdminBookingDetail[]>`
    SELECT id, instructor_id, customer_name, phone, status, booking_date, start_time, end_time, calendar_event_id, payment_intent_id, conversation_id, created_at
    FROM bookings
    WHERE id = ${bookingId}
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Retrieves audit trail for a booking (read-only).
 * Ordered by created_at ASC.
 * 
 * @param bookingId - Booking ID
 * @returns Array of audit entries
 */
export async function getBookingAuditTrail(bookingId: string): Promise<BookingAuditEntry[]> {
  const result = await sql<BookingAuditEntry[]>`
    SELECT id, booking_id, previous_state, new_state, actor, created_at
    FROM booking_audit
    WHERE booking_id = ${bookingId}
    ORDER BY created_at ASC
  `;

  return result;
}

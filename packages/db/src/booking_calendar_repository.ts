import { sql } from './client.js';
import { Booking, BookingNotFoundError } from './booking_repository.js';

export interface BookingWithCalendarEvent extends Booking {
  calendar_event_id: string | null;
}

export interface AttachCalendarEventToBookingParams {
  bookingId: string;
  calendarEventId: string;
}

export interface DetachCalendarEventFromBookingParams {
  bookingId: string;
}

export interface CalendarEventForBookingResult {
  calendarEventId: string | null;
}

/**
 * Attaches a calendar event to a booking by setting calendar_event_id.
 * 
 * @param params - Attachment parameters
 * @returns Updated booking with calendar_event_id
 * @throws BookingNotFoundError if booking does not exist
 */
export async function attachCalendarEventToBooking(
  params: AttachCalendarEventToBookingParams
): Promise<BookingWithCalendarEvent> {
  const result = await sql<BookingWithCalendarEvent[]>`
    UPDATE bookings
    SET calendar_event_id = ${params.calendarEventId}, updated_at = NOW()
    WHERE id = ${params.bookingId}
    RETURNING id, instructor_id, start_time, end_time, state, idempotency_key, calendar_event_id, created_at, updated_at
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(params.bookingId);
  }

  return result[0];
}

/**
 * Detaches a calendar event from a booking by setting calendar_event_id to null.
 * 
 * @param params - Detachment parameters
 * @returns Updated booking with calendar_event_id = null
 * @throws BookingNotFoundError if booking does not exist
 */
export async function detachCalendarEventFromBooking(
  params: DetachCalendarEventFromBookingParams
): Promise<BookingWithCalendarEvent> {
  const result = await sql<BookingWithCalendarEvent[]>`
    UPDATE bookings
    SET calendar_event_id = NULL, updated_at = NOW()
    WHERE id = ${params.bookingId}
    RETURNING id, instructor_id, start_time, end_time, state, idempotency_key, calendar_event_id, created_at, updated_at
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(params.bookingId);
  }

  return result[0];
}

/**
 * Retrieves the calendar event ID for a booking.
 * 
 * @param bookingId - Booking ID
 * @returns Calendar event ID or null if not attached
 * @throws BookingNotFoundError if booking does not exist
 */
export async function getCalendarEventForBooking(
  bookingId: string
): Promise<CalendarEventForBookingResult> {
  const result = await sql<BookingWithCalendarEvent[]>`
    SELECT id, instructor_id, start_time, end_time, state, idempotency_key, calendar_event_id, created_at, updated_at
    FROM bookings
    WHERE id = ${bookingId}
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(bookingId);
  }

  return {
    calendarEventId: result[0].calendar_event_id,
  };
}

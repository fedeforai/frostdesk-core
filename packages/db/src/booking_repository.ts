import { sql } from './client.js';
import type { BookingState } from './booking_state_machine.js';

/**
 * Error thrown when a booking is not found.
 */
export class BookingNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Booking not found: ${bookingId}`);
    this.name = 'BookingNotFoundError';
  }
}

/**
 * Creates a new booking.
 * 
 * @param payload - Booking data
 * @returns Created booking ID
 */
export async function createBooking(payload: {
  instructorId: string;
  customerName: string;
  startTime: string;
  endTime: string;
  serviceId?: string | null;
  meetingPointId?: string | null;
  notes?: string | null;
}): Promise<{ id: string }> {
  const result = await sql<{ id: string }[]>`
    INSERT INTO bookings (
      instructor_id,
      customer_name,
      start_time,
      end_time,
      service_id,
      meeting_point_id,
      notes,
      created_at
    )
    VALUES (
      ${payload.instructorId},
      ${payload.customerName},
      ${payload.startTime},
      ${payload.endTime},
      ${payload.serviceId ?? null},
      ${payload.meetingPointId ?? null},
      ${payload.notes ?? null},
      NOW()
    )
    RETURNING id
  `;

  if (result.length === 0) {
    throw new Error('Failed to create booking: no row returned');
  }

  return { id: result[0].id };
}

/**
 * Retrieves a booking by its ID.
 * 
 * @param bookingId - Booking ID
 * @param instructorId - Instructor ID
 * @returns Booking row or null if not found
 */
export async function getBookingById(
  bookingId: string,
  instructorId: string
): Promise<any | null> {
  const result = await sql<any[]>`
    SELECT 
      id,
      instructor_id,
      customer_name,
      start_time,
      end_time,
      service_id,
      meeting_point_id,
      notes,
      status,
      created_at
    FROM bookings
    WHERE id = ${bookingId}
      AND instructor_id = ${instructorId}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Lists all bookings for an instructor.
 * 
 * @param instructorId - Instructor ID
 * @returns Array of booking rows
 */
export async function listInstructorBookings(
  instructorId: string
): Promise<any[]> {
  const result = await sql<any[]>`
    SELECT 
      id,
      instructor_id,
      customer_name,
      start_time,
      end_time,
      service_id,
      meeting_point_id,
      notes,
      status,
      created_at
    FROM bookings
    WHERE instructor_id = ${instructorId}
    ORDER BY start_time DESC
  `;

  return result;
}

/**
 * Updates the state/status of a booking.
 * 
 * @param bookingId - Booking ID
 * @param newStatus - New booking status
 * @returns Updated booking or null if not found
 */
export async function updateBookingState(
  bookingId: string,
  newStatus: BookingState
): Promise<any | null> {
  const result = await sql<any[]>`
    UPDATE bookings
    SET status = ${newStatus}, updated_at = NOW()
    WHERE id = ${bookingId}
    RETURNING id, instructor_id, customer_name, start_time, end_time, service_id, meeting_point_id, notes, status, created_at, updated_at
  `;

  return result.length > 0 ? result[0] : null;
}

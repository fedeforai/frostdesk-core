import { sql } from './client.js';
import type { BookingState } from './booking_state_machine.js';
import { upsertCustomer } from './customer_profile_repository.js';

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
 * When customerId is provided, customer_id is set and customer_name is used as display fallback (legacy column).
 * When customerId is not provided (legacy path), only customer_name is set and upsertCustomer may run.
 *
 * @param payload - Booking data
 * @returns Created booking ID
 */
export async function createBooking(payload: {
  instructorId: string;
  customerName: string;
  startTime: string;
  endTime: string;
  customerId?: string | null;
  serviceId?: string | null;
  meetingPointId?: string | null;
  notes?: string | null;
  phone?: string | null;
}): Promise<{ id: string }> {
  const result = await sql<{ id: string }[]>`
    INSERT INTO bookings (
      instructor_id,
      customer_name,
      customer_id,
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
      ${payload.customerId ?? null},
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

  if (!payload.customerId) {
    try {
      await upsertCustomer({
        instructorId: payload.instructorId,
        phoneNumber: payload.phone ?? null,
        displayName: payload.customerName.trim() || null,
        source: 'booking',
      });
    } catch {
      // non-fatal: booking already created
    }
  }

  return { id: result[0].id };
}

/**
 * Returns the instructor_id for a booking, or null if not found.
 */
export async function getBookingInstructorId(bookingId: string): Promise<string | null> {
  const result = await sql<{ instructor_id: string }[]>`
    SELECT instructor_id FROM bookings WHERE id = ${bookingId} LIMIT 1
  `;
  return result.length > 0 ? result[0].instructor_id : null;
}

/**
 * Retrieves a booking by its ID with minimal customer info from customer_profiles.
 *
 * @param bookingId - Booking ID
 * @param instructorId - Instructor ID
 * @returns Booking row with customer_display_name, customer_phone (or null), or null if not found
 */
export async function getBookingById(
  bookingId: string,
  instructorId: string
): Promise<any | null> {
  const result = await sql<any[]>`
    SELECT 
      b.id,
      b.instructor_id,
      b.customer_id,
      b.customer_name,
      b.start_time,
      b.end_time,
      b.service_id,
      b.meeting_point_id,
      b.notes,
      b.status,
      b.created_at,
      cp.display_name AS customer_display_name,
      cp.phone_number AS customer_phone
    FROM bookings b
    LEFT JOIN customer_profiles cp ON cp.id = b.customer_id AND cp.instructor_id = b.instructor_id
    WHERE b.id = ${bookingId}
      AND b.instructor_id = ${instructorId}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Lists confirmed/modified bookings overlapping [startUtc, endUtc] for slot computation.
 */
export async function getConfirmedOrModifiedBookingsInRange(
  instructorId: string,
  startUtc: string,
  endUtc: string
): Promise<Array<{ start_time: string; end_time: string }>> {
  const result = await sql<Array<{ start_time: string; end_time: string }>>`
    SELECT start_time, end_time
    FROM bookings
    WHERE instructor_id = ${instructorId}
      AND status IN ('confirmed', 'modified')
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
      AND start_time::timestamptz < ${endUtc}::timestamptz
      AND end_time::timestamptz > ${startUtc}::timestamptz
    ORDER BY start_time ASC
  `;
  return result;
}

/**
 * Lists all bookings for an instructor with minimal customer info from customer_profiles.
 * Join is lightweight (display_name, phone_number). Legacy rows without customer_id keep customer_name.
 *
 * @param instructorId - Instructor ID
 * @returns Array of booking rows with customer_display_name, customer_phone (from join, or null)
 */
export async function listInstructorBookings(
  instructorId: string
): Promise<any[]> {
  const result = await sql<any[]>`
    SELECT 
      b.id,
      b.instructor_id,
      b.customer_id,
      b.customer_name,
      b.start_time,
      b.end_time,
      b.service_id,
      b.meeting_point_id,
      b.notes,
      b.status,
      b.created_at,
      cp.display_name AS customer_display_name,
      cp.phone_number AS customer_phone
    FROM bookings b
    LEFT JOIN customer_profiles cp ON cp.id = b.customer_id AND cp.instructor_id = b.instructor_id
    WHERE b.instructor_id = ${instructorId}
    ORDER BY COALESCE(b.start_time, b.created_at) DESC
  `;

  return result;
}

/**
 * Updates the state/status of a booking (no instructor filter; used internally e.g. expiry).
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
    RETURNING id, instructor_id, customer_id, customer_name, start_time, end_time, service_id, meeting_point_id, notes, status, created_at, updated_at
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Partial update of a booking. Only provided fields are updated. Always filters by instructor_id.
 *
 * @param bookingId - Booking ID
 * @param instructorId - Instructor ID (ownership)
 * @param fields - start_time, end_time, notes, customer_name (all optional)
 * @returns Updated booking or null if not found / not owner
 */
export async function updateBooking(
  bookingId: string,
  instructorId: string,
  fields: {
    start_time?: string;
    end_time?: string;
    notes?: string | null;
    customer_name?: string;
  }
): Promise<any | null> {
  const existing = await getBookingById(bookingId, instructorId);
  if (!existing) return null;

  const start_time = fields.start_time !== undefined ? fields.start_time : existing.start_time;
  const end_time = fields.end_time !== undefined ? fields.end_time : existing.end_time;
  const notes = fields.notes !== undefined ? fields.notes : existing.notes;
  const customer_name = fields.customer_name !== undefined ? fields.customer_name : existing.customer_name;

  const result = (await sql<any[]>`
    UPDATE bookings
    SET updated_at = NOW(), start_time = ${start_time}, end_time = ${end_time}, notes = ${notes}, customer_name = ${customer_name}
    WHERE id = ${bookingId} AND instructor_id = ${instructorId}
    RETURNING id, instructor_id, customer_id, customer_name, start_time, end_time, service_id, meeting_point_id, notes, status, created_at, updated_at
  `) as any[];
  return result.length > 0 ? result[0] : null;
}

export type UpdateBookingDetailsPatch = {
  customer_id?: string | null;
  customer_name?: string;
  start_time?: string;
  end_time?: string;
  service_id?: string | null;
  meeting_point_id?: string | null;
  notes?: string | null;
};

/**
 * Updates only the provided booking fields. Enforces ownership (instructor_id) in the WHERE clause.
 * Use for PATCH edit: customer_name, start_time, end_time, service_id, meeting_point_id, notes.
 *
 * @param bookingId - Booking ID
 * @param instructorId - Instructor ID (ownership)
 * @param patch - Only keys present are updated
 * @returns Updated booking row or null if not found / not owner
 */
export async function updateBookingDetails(
  bookingId: string,
  instructorId: string,
  patch: UpdateBookingDetailsPatch
): Promise<any | null> {
  const existing = await getBookingById(bookingId, instructorId);
  if (!existing) return null;

  const customer_id = patch.customer_id !== undefined ? patch.customer_id : existing.customer_id;
  const customer_name = patch.customer_name !== undefined ? patch.customer_name : existing.customer_name;
  const start_time = patch.start_time !== undefined ? patch.start_time : existing.start_time;
  const end_time = patch.end_time !== undefined ? patch.end_time : existing.end_time;
  const service_id = patch.service_id !== undefined ? patch.service_id : existing.service_id;
  const meeting_point_id = patch.meeting_point_id !== undefined ? patch.meeting_point_id : existing.meeting_point_id;
  const notes = patch.notes !== undefined ? patch.notes : existing.notes;

  const result = await sql<any[]>`
    UPDATE bookings
    SET updated_at = NOW(),
        customer_id = ${customer_id},
        customer_name = ${customer_name},
        start_time = ${start_time},
        end_time = ${end_time},
        service_id = ${service_id},
        meeting_point_id = ${meeting_point_id},
        notes = ${notes}
    WHERE id = ${bookingId} AND instructor_id = ${instructorId}
    RETURNING id, instructor_id, customer_id, customer_name, start_time, end_time, service_id, meeting_point_id, notes, status, created_at, updated_at
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Updates booking status. Always filters by instructor_id (ownership-safe).
 *
 * @param bookingId - Booking ID
 * @param instructorId - Instructor ID
 * @param newStatus - New status
 * @returns Updated booking or null if not found / not owner
 */
export async function updateBookingStatus(
  bookingId: string,
  instructorId: string,
  newStatus: BookingState
): Promise<any | null> {
  const result = await sql<any[]>`
    UPDATE bookings
    SET status = ${newStatus}, updated_at = NOW()
    WHERE id = ${bookingId} AND instructor_id = ${instructorId}
    RETURNING id, instructor_id, customer_id, customer_name, start_time, end_time, service_id, meeting_point_id, notes, status, created_at, updated_at
  `;
  return result.length > 0 ? result[0] : null;
}

/**
 * Soft-delete: sets status to 'cancelled'. Always filters by instructor_id.
 *
 * @param bookingId - Booking ID
 * @param instructorId - Instructor ID
 * @returns Updated booking or null if not found / not owner
 */
export async function deleteBooking(
  bookingId: string,
  instructorId: string
): Promise<any | null> {
  return updateBookingStatus(bookingId, instructorId, 'cancelled');
}

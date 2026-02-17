import { sql } from './client.js';
import { BookingState } from './booking_state_machine.js';

export interface AdminBookingSummary {
  id: string;
  instructor_id: string;
  customer_name: string | null;
  phone: string | null;
  status: BookingState;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  calendar_event_id: string | null;
  payment_intent_id: string | null;
  created_at: string;
}

export interface ListAllBookingsParams {
  limit: number;
  offset: number;
  instructorId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Lists all bookings across all instructors (read-only).
 * Ordered by booking_date DESC, start_time DESC.
 * 
 * @param params - Query parameters with pagination and optional filters
 * @returns Array of booking summaries
 */
export async function listAllBookings(
  params: ListAllBookingsParams
): Promise<AdminBookingSummary[]> {
  const { limit, offset, instructorId, status, dateFrom, dateTo } = params;

  const result = await sql<AdminBookingSummary[]>`
    SELECT id, instructor_id, customer_name, phone, status, booking_date, start_time, end_time, calendar_event_id, payment_intent_id, created_at
    FROM bookings
    WHERE 1=1
      ${instructorId ? sql`AND instructor_id = ${instructorId}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}
      ${dateFrom ? sql`AND booking_date >= ${dateFrom}` : sql``}
      ${dateTo ? sql`AND booking_date <= ${dateTo}` : sql``}
    ORDER BY booking_date DESC, start_time DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result;
}

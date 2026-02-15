/**
 * Customer Booking Context (Loop C)
 *
 * Read-only. No mutations. No side effects.
 * Derives structured context from existing bookings + customer_profiles.
 * Used to improve AI suggestion quality for repeat customers.
 *
 * Never throws. Returns null on any error.
 */

import { sql } from './client.js';

export interface CustomerBookingContext {
  /** Duration of the last completed lesson (minutes). */
  lastDurationMinutes: number | null;
  /** Date of the last completed booking (ISO string). */
  lastBookingDate: string | null;
  /** Total completed bookings for this customer with this instructor. */
  completedCount: number;
  /** Notes from the last completed booking (may contain level, preferences). */
  lastNotes: string | null;
  /** Customer display name (from customer_profiles). */
  customerDisplayName: string | null;
}

/**
 * Fetches structured context from the customer's booking history.
 *
 * Uses only completed bookings. Single query, fast.
 * Fail-open: returns null on any error.
 *
 * @param instructorId  Instructor UUID
 * @param customerId    Customer profile UUID
 */
export async function getLastCompletedBookingContext(
  instructorId: string,
  customerId: string,
): Promise<CustomerBookingContext | null> {
  try {
    // Single query: last completed booking + count + customer name
    const rows = await sql<Array<{
      start_time: string | null;
      end_time: string | null;
      booking_date: string | null;
      notes: string | null;
      completed_count: string;
      display_name: string | null;
    }>>`
      SELECT
        b.start_time,
        b.end_time,
        b.booking_date,
        b.notes,
        (SELECT COUNT(*)::text
         FROM bookings b2
         WHERE b2.instructor_id = ${instructorId}::uuid
           AND b2.customer_id = ${customerId}::uuid
           AND b2.status = 'completed'
        ) AS completed_count,
        cp.display_name
      FROM bookings b
      LEFT JOIN customer_profiles cp ON cp.id = b.customer_id
      WHERE b.instructor_id = ${instructorId}::uuid
        AND b.customer_id = ${customerId}::uuid
        AND b.status = 'completed'
      ORDER BY b.start_time DESC NULLS LAST
      LIMIT 1
    `;

    if (rows.length === 0) {
      return {
        lastDurationMinutes: null,
        lastBookingDate: null,
        completedCount: 0,
        lastNotes: null,
        customerDisplayName: null,
      };
    }

    const row = rows[0];

    // Compute duration from start/end times
    let lastDurationMinutes: number | null = null;
    if (row.start_time && row.end_time) {
      const start = new Date(row.start_time).getTime();
      const end = new Date(row.end_time).getTime();
      const diffMs = end - start;
      if (diffMs > 0) {
        lastDurationMinutes = Math.round(diffMs / 60_000);
      }
    }

    // Best available date
    const lastBookingDate = row.booking_date
      ?? (row.start_time ? row.start_time.slice(0, 10) : null);

    return {
      lastDurationMinutes,
      lastBookingDate,
      completedCount: Number(row.completed_count) || 0,
      lastNotes: row.notes?.trim() || null,
      customerDisplayName: row.display_name?.trim() || null,
    };
  } catch {
    // Fail-open: memory is never critical
    return null;
  }
}

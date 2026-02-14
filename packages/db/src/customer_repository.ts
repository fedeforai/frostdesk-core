import { sql } from './client.js';

/**
 * Count bookings for a customer. Matches by instructor_id and customer_name = display_name.
 * No customer_id on bookings; linkage is by (instructor_id, display_name).
 */
export async function countBookingsByCustomerId(customerId: string): Promise<number> {
  const customer = await sql<{ instructor_id: string; display_name: string | null }[]>`
    SELECT instructor_id, display_name FROM customer_profiles WHERE id = ${customerId} LIMIT 1
  `;
  if (customer.length === 0) return 0;
  const { instructor_id, display_name } = customer[0];
  const name = display_name?.trim() || null;
  if (!name) return 0;
  const result = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count
    FROM bookings
    WHERE instructor_id = ${instructor_id}
      AND customer_name = ${name}
  `;
  return result.length > 0 ? parseInt(result[0].count, 10) || 0 : 0;
}

/**
 * Get notes count and bookings count for a customer. Instructor-scoped (customer id implies instructor).
 */
export async function getCustomerStats(customerId: string): Promise<{
  notesCount: number;
  bookingsCount: number;
}> {
  const [notesResult, bookingsCount] = await Promise.all([
    sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM customer_notes WHERE customer_id = ${customerId}
    `,
    countBookingsByCustomerId(customerId),
  ]);
  const notesCount = notesResult.length > 0 ? parseInt(notesResult[0].count, 10) || 0 : 0;
  return { notesCount, bookingsCount };
}

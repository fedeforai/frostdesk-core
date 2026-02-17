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

/**
 * Sum of amount_cents for all bookings linked to this customer (customer_id).
 * Used for "total revenue" on customer profile. Currency is the first non-null from those bookings.
 */
export async function getCustomerRevenue(customerId: string): Promise<{
  total_amount_cents: number;
  currency: string | null;
}> {
  const result = await sql<{ total_cents: string; currency: string | null }[]>`
    SELECT
      COALESCE(SUM(amount_cents), 0)::text AS total_cents,
      (SELECT currency FROM bookings WHERE customer_id = ${customerId} AND currency IS NOT NULL LIMIT 1) AS currency
    FROM bookings
    WHERE customer_id = ${customerId}
  `;
  const row = result[0];
  const total_amount_cents = row ? parseInt(row.total_cents, 10) || 0 : 0;
  const currency = row?.currency?.trim() || null;
  return { total_amount_cents, currency };
}

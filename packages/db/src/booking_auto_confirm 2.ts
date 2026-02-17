import { sql } from './client.js';

/**
 * Atomically moves a booking to 'confirmed' ONLY if the current status
 * is in an eligible set (draft, pending).
 *
 * Returns true if the row was actually updated, false otherwise
 * (already confirmed, cancelled, etc.).
 *
 * Called by the Stripe webhook after payment_status becomes 'paid'.
 */
export async function autoConfirmBookingIfEligible(bookingId: string): Promise<boolean> {
  const result = await sql`
    UPDATE bookings
    SET status = 'confirmed',
        updated_at = NOW()
    WHERE id = ${bookingId}::uuid
      AND status IN ('draft', 'pending')
    RETURNING id
  `;
  return result.length > 0;
}

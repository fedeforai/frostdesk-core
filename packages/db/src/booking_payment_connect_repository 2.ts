/**
 * Repository for booking payment fields (Stripe Connect Checkout).
 * Manages payment_status, checkout_session_id, etc. on the bookings table.
 */
import { sql } from './client.js';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';

export interface BookingPaymentRow {
  id: string;
  instructor_id: string;
  payment_status: PaymentStatus;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  charge_id: string | null;
  connected_account_id: string | null;
  paid_at: string | null;
  payment_url: string | null;
  amount_cents: number | null;
  currency: string | null;
}

/**
 * Get payment fields for a booking.
 */
export async function getBookingPayment(
  bookingId: string,
  instructorId: string,
): Promise<BookingPaymentRow | null> {
  const rows = await sql<BookingPaymentRow[]>`
    SELECT id, instructor_id, payment_status, checkout_session_id,
           payment_intent_id, charge_id, connected_account_id, paid_at, payment_url,
           amount_cents, currency
    FROM bookings
    WHERE id = ${bookingId}::uuid AND instructor_id = ${instructorId}::uuid
  `;
  return rows[0] ?? null;
}

/**
 * Set booking to payment-pending state after Checkout Session creation.
 */
export async function setBookingPaymentPending(
  bookingId: string,
  instructorId: string,
  checkoutSessionId: string,
  paymentUrl: string,
  connectedAccountId: string,
): Promise<void> {
  await sql`
    UPDATE bookings
    SET payment_status = 'pending',
        checkout_session_id = ${checkoutSessionId},
        payment_url = ${paymentUrl},
        connected_account_id = ${connectedAccountId},
        updated_at = NOW()
    WHERE id = ${bookingId}::uuid
      AND instructor_id = ${instructorId}::uuid
  `;
}

/**
 * Mark booking as paid (called ONLY from webhook).
 * Idempotent: `IS DISTINCT FROM 'paid'` means no-op if already paid.
 * Requires connected_account_id match for Connect integrity.
 * Persists amount_cents + currency from Stripe session for revenue snapshot.
 */
export async function setBookingPaymentPaid(
  checkoutSessionId: string,
  paymentIntentId: string | null,
  chargeId: string | null,
  paidAtIso: string,
  connectedAccountId: string,
  amountCents?: number | null,
  currency?: string | null,
): Promise<BookingPaymentRow | null> {
  const rows = await sql<BookingPaymentRow[]>`
    UPDATE bookings
    SET payment_status = 'paid',
        payment_intent_id = ${paymentIntentId},
        charge_id = ${chargeId},
        paid_at = ${paidAtIso}::timestamptz,
        amount_cents = COALESCE(${amountCents ?? null}, amount_cents),
        currency = COALESCE(${currency ?? null}, currency),
        updated_at = NOW()
    WHERE checkout_session_id = ${checkoutSessionId}
      AND connected_account_id = ${connectedAccountId}
      AND payment_status IS DISTINCT FROM 'paid'
    RETURNING id, instructor_id, payment_status, checkout_session_id,
              payment_intent_id, charge_id, connected_account_id, paid_at, payment_url,
              amount_cents, currency
  `;
  return rows[0] ?? null;
}

/**
 * Mark booking payment as failed (called ONLY from webhook).
 * Uses `IS DISTINCT FROM 'paid'` to never downgrade a paid booking.
 * Requires connected_account_id match for Connect integrity.
 */
export async function setBookingPaymentFailed(
  checkoutSessionId: string,
  connectedAccountId: string,
): Promise<BookingPaymentRow | null> {
  const rows = await sql<BookingPaymentRow[]>`
    UPDATE bookings
    SET payment_status = 'failed',
        updated_at = NOW()
    WHERE checkout_session_id = ${checkoutSessionId}
      AND connected_account_id = ${connectedAccountId}
      AND payment_status IS DISTINCT FROM 'paid'
      AND payment_status IS DISTINCT FROM 'refunded'
    RETURNING id, instructor_id, payment_status, checkout_session_id,
              payment_intent_id, charge_id, connected_account_id, paid_at, payment_url,
              amount_cents, currency
  `;
  return rows[0] ?? null;
}

/**
 * Find booking by checkout_session_id (for webhook lookups).
 */
export async function getBookingByCheckoutSession(
  checkoutSessionId: string,
): Promise<BookingPaymentRow | null> {
  const rows = await sql<BookingPaymentRow[]>`
    SELECT id, instructor_id, payment_status, checkout_session_id,
           payment_intent_id, charge_id, connected_account_id, paid_at, payment_url,
           amount_cents, currency
    FROM bookings
    WHERE checkout_session_id = ${checkoutSessionId}
  `;
  return rows[0] ?? null;
}

import { sql } from './client.js';
import { Booking, BookingNotFoundError } from './booking_repository.js';

export interface BookingWithPaymentIntent extends Booking {
  payment_intent_id: string | null;
}

export interface AttachPaymentIntentToBookingParams {
  bookingId: string;
  paymentIntentId: string;
}

export interface DetachPaymentIntentFromBookingParams {
  bookingId: string;
}

export interface PaymentIntentForBookingResult {
  paymentIntentId: string | null;
}

/**
 * Attaches a payment intent to a booking by setting payment_intent_id.
 * 
 * @param params - Attachment parameters
 * @returns Updated booking with payment_intent_id
 * @throws BookingNotFoundError if booking does not exist
 */
export async function attachPaymentIntentToBooking(
  params: AttachPaymentIntentToBookingParams
): Promise<BookingWithPaymentIntent> {
  const result = await sql<BookingWithPaymentIntent[]>`
    UPDATE bookings
    SET payment_intent_id = ${params.paymentIntentId}, updated_at = NOW()
    WHERE id = ${params.bookingId}
    RETURNING id, instructor_id, start_time, end_time, state, idempotency_key, payment_intent_id, created_at, updated_at
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(params.bookingId);
  }

  return result[0];
}

/**
 * Detaches a payment intent from a booking by setting payment_intent_id to null.
 * 
 * @param params - Detachment parameters
 * @returns Updated booking with payment_intent_id = null
 * @throws BookingNotFoundError if booking does not exist
 */
export async function detachPaymentIntentFromBooking(
  params: DetachPaymentIntentFromBookingParams
): Promise<BookingWithPaymentIntent> {
  const result = await sql<BookingWithPaymentIntent[]>`
    UPDATE bookings
    SET payment_intent_id = NULL, updated_at = NOW()
    WHERE id = ${params.bookingId}
    RETURNING id, instructor_id, start_time, end_time, state, idempotency_key, payment_intent_id, created_at, updated_at
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(params.bookingId);
  }

  return result[0];
}

/**
 * Retrieves the payment intent ID for a booking.
 * 
 * @param bookingId - Booking ID
 * @returns Payment intent ID or null if not attached
 * @throws BookingNotFoundError if booking does not exist
 */
export async function getPaymentIntentForBooking(
  bookingId: string
): Promise<PaymentIntentForBookingResult> {
  const result = await sql<BookingWithPaymentIntent[]>`
    SELECT id, instructor_id, start_time, end_time, state, idempotency_key, payment_intent_id, created_at, updated_at
    FROM bookings
    WHERE id = ${bookingId}
  `;

  if (result.length === 0) {
    throw new BookingNotFoundError(bookingId);
  }

  return {
    paymentIntentId: result[0].payment_intent_id,
  };
}

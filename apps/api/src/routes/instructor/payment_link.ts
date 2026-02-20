/**
 * Payment link generation for bookings via Stripe Connect Checkout.
 *
 * POST /instructor/bookings/:bookingId/payment-link
 * GET  /instructor/bookings/:bookingId/payment
 *
 * Safety:
 *   - Integer cents validation + currency whitelist
 *   - Duplicate prevention: reuse existing pending session
 *   - client_reference_id on Checkout Session
 *   - Ownership check: booking must belong to instructor
 *   - Connected account mismatch guardrail
 *   - session.url null guardrail (no DB writes)
 */
import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorStripeInfo,
  getBookingById,
  getBookingPayment,
  setBookingPaymentPending,
  insertAuditEvent,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { getStripe } from '../../lib/stripe_client.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

const INSTRUCTOR_APP_BASE = process.env.INSTRUCTOR_APP_URL || 'http://localhost:3000';

const ALLOWED_CURRENCIES = new Set(['eur', 'gbp', 'chf']);
const MIN_AMOUNT_CENTS = 100;       // 1.00
const MAX_AMOUNT_CENTS = 1_000_000; // 10,000.00

type PaymentLinkBody = {
  amount?: number; // integer cents
  currency?: string;
  description?: string;
};

async function resolveInstructor(request: { headers?: { authorization?: string } }) {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) {
    const e = new Error('Instructor profile not found');
    (e as any).code = 'NOT_FOUND';
    throw e;
  }
  return profile;
}

export async function instructorPaymentLinkRoutes(app: FastifyInstance): Promise<void> {
  // ── Generate payment link ────────────────────────────────────────────────
  app.post('/instructor/bookings/:bookingId/payment-link', async (request, reply) => {
    try {
      const profile = await resolveInstructor(request);
      const instructorId = profile.id;
      const { bookingId } = request.params as { bookingId: string };

      // ── Stripe Connect enabled? ─────────────────────────────────────────
      const stripeInfo = await getInstructorStripeInfo(instructorId);
      if (!stripeInfo?.stripeAccountId || stripeInfo.stripeConnectStatus !== 'enabled') {
        return reply.status(412).send({
          ok: false,
          error: 'STRIPE_NOT_CONNECTED',
          message: 'Stripe Connect account not yet enabled. Complete onboarding first.',
        });
      }

      // ── Booking exists + ownership ──────────────────────────────────────
      const booking = await getBookingById(bookingId, instructorId);
      if (!booking) {
        return reply.status(404).send({
          ok: false,
          error: 'NOT_FOUND',
          message: 'Booking not found or not owned by this instructor',
        });
      }

      // ── Payment state guardrails ────────────────────────────────────────
      const paymentInfo = await getBookingPayment(bookingId, instructorId);

      if (paymentInfo?.payment_status === 'paid') {
        return reply.status(409).send({
          ok: false,
          error: 'ALREADY_PAID',
          message: 'This booking has already been paid',
        });
      }

      if (paymentInfo?.payment_status === 'refunded') {
        return reply.status(409).send({
          ok: false,
          error: 'REFUNDED',
          message: 'This booking has been refunded and cannot be paid again.',
        });
      }

      // Connected account mismatch: the booking was linked to a different
      // Stripe account than the instructor currently has.
      if (
        paymentInfo?.connected_account_id &&
        paymentInfo.connected_account_id !== stripeInfo.stripeAccountId
      ) {
        return reply.status(409).send({
          ok: false,
          error: 'CONNECTED_ACCOUNT_MISMATCH',
          message: 'Stored connected_account_id does not match current instructor Stripe account.',
        });
      }

      // Duplicate prevention: reuse existing pending session
      if (paymentInfo?.payment_status === 'pending') {
        if (paymentInfo.checkout_session_id && paymentInfo.payment_url) {
          return reply.send({
            ok: true,
            url: paymentInfo.payment_url,
            checkoutSessionId: paymentInfo.checkout_session_id,
            reused: true,
          });
        }

        // Pending but missing session_id or url → corrupted record
        return reply.status(409).send({
          ok: false,
          error: 'CORRUPT_PAYMENT_RECORD',
          message: 'Payment record is pending but missing checkout_session_id or payment_url.',
        });
      }

      // ── Validate input ──────────────────────────────────────────────────
      const body = (request.body || {}) as PaymentLinkBody;
      const amount = body.amount;
      const currency = (body.currency || 'eur').toLowerCase();
      const description =
        body.description ||
        `Lezione ${booking.customer_name || 'Booking'} — ${bookingId.slice(0, 8)}`;

      if (!ALLOWED_CURRENCIES.has(currency)) {
        return reply.status(400).send({
          ok: false,
          error: 'INVALID_CURRENCY',
          message: `Unsupported currency. Allowed: ${Array.from(ALLOWED_CURRENCIES).join(', ')}`,
        });
      }

      if (amount === undefined || amount === null || !Number.isInteger(amount) || amount <= 0) {
        return reply.status(400).send({
          ok: false,
          error: 'INVALID_AMOUNT',
          message: 'Amount must be a positive integer (cents). Example: 12000 for 120.00',
        });
      }

      if (amount < MIN_AMOUNT_CENTS || amount > MAX_AMOUNT_CENTS) {
        return reply.status(400).send({
          ok: false,
          error: 'INVALID_AMOUNT',
          message: `Amount must be between ${MIN_AMOUNT_CENTS} and ${MAX_AMOUNT_CENTS} cents`,
        });
      }

      // ── Create Checkout Session on the connected account ────────────────
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          client_reference_id: bookingId,
          line_items: [
            {
              price_data: {
                currency,
                unit_amount: amount,
                product_data: { name: description },
              },
              quantity: 1,
            },
          ],
          metadata: {
            booking_id: bookingId,
            instructor_id: instructorId,
          },
          success_url: `${INSTRUCTOR_APP_BASE}/instructor/bookings/${bookingId}?payment=success`,
          cancel_url: `${INSTRUCTOR_APP_BASE}/instructor/bookings/${bookingId}?payment=cancelled`,
        },
        { stripeAccount: stripeInfo.stripeAccountId },
      );

      // Guardrail: session.url must exist for link-based flow.
      // If Stripe returned null, don't write to DB — the record would be unrecoverable.
      if (!session.url) {
        return reply.status(502).send({
          ok: false,
          error: 'STRIPE_SESSION_URL_MISSING',
          message: 'Stripe did not return a session URL. Cannot generate payment link.',
        });
      }

      // ── Persist payment state ───────────────────────────────────────────
      await setBookingPaymentPending(
        bookingId,
        instructorId,
        session.id,
        session.url,
        stripeInfo.stripeAccountId,
      );

      // Audit log (fail-open)
      try {
        await insertAuditEvent({
          actor_type: 'instructor',
          actor_id: instructorId,
          action: 'payment_link_generated',
          entity_type: 'booking',
          entity_id: bookingId,
          severity: 'info',
          payload: {
            checkout_session_id: session.id,
            amount,
            currency,
            connected_account_id: stripeInfo.stripeAccountId,
          },
        });
      } catch { /* fail-open */ }

      return reply.send({
        ok: true,
        url: session.url,
        checkoutSessionId: session.id,
        reused: false,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // ── Get payment status for a booking ─────────────────────────────────────
  app.get('/instructor/bookings/:bookingId/payment', async (request, reply) => {
    try {
      const profile = await resolveInstructor(request);
      const { bookingId } = request.params as { bookingId: string };
      const payment = await getBookingPayment(bookingId, profile.id);

      if (!payment) {
        return reply.status(404).send({ ok: false, error: 'NOT_FOUND', message: 'Booking not found' });
      }

      return reply.send({
        ok: true,
        paymentStatus: payment.payment_status,
        checkoutSessionId: payment.checkout_session_id,
        paymentUrl: payment.payment_url,
        paidAt: payment.paid_at,
        chargeId: payment.charge_id,
        connectedAccountId: payment.connected_account_id,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}

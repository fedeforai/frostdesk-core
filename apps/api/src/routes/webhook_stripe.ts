/**
 * Stripe webhook handler (Connect-aware).
 *
 * POST /webhook/stripe
 *
 * Handles:
 *   - checkout.session.completed           → mark booking paid, auto-confirm if draft/pending
 *   - checkout.session.expired             → mark booking payment failed
 *   - checkout.session.async_payment_failed → mark booking payment failed
 *   - payment_intent.payment_failed        → audit log only (metadata lives on session, not PI)
 *   - account.updated                      → update instructor stripe_connect_status
 *
 * Safety:
 *   - Raw body parser scoped to this encapsulated plugin (won't break other JSON routes)
 *   - event.id deduplication via stripe_webhook_events table (tryInsertStripeWebhookEvent)
 *   - connected_account_id match on all payment writes
 *   - Atomic booking_status auto-confirm when payment_status becomes 'paid'
 */
import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import {
  tryInsertStripeWebhookEvent,
  setBookingPaymentPaid,
  setBookingPaymentFailed,
  autoConfirmBookingIfEligible,
  findInstructorByStripeAccountId,
  updateStripeConnectStatus,
  insertAuditEvent,
} from '@frostdesk/db';
import type { StripeConnectStatus } from '@frostdesk/db';
import { getStripe } from '../lib/stripe_client.js';

/**
 * Registers the /webhook/stripe route inside its own encapsulated Fastify plugin.
 *
 * The raw body content-type parser is scoped to THIS plugin only because
 * Fastify plugins get their own encapsulation context by default — so the
 * `addContentTypeParser('application/json', { parseAs: 'buffer' })` call
 * does NOT leak to sibling routes (health, instructor, admin, etc.).
 */
export async function webhookStripeRoutes(app: FastifyInstance): Promise<void> {
  // Raw body parser — scoped to this plugin's encapsulation context.
  // Stripe signature verification requires the raw bytes, not parsed JSON.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post('/webhook/stripe', async (request, reply) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      request.log.error('STRIPE_WEBHOOK_SECRET not configured');
      return reply.status(500).send({ ok: false, error: 'Webhook secret not configured' });
    }

    // ── Signature verification ──────────────────────────────────────────────
    const sig = request.headers['stripe-signature'] as string | undefined;
    if (!sig) {
      return reply.status(400).send({ ok: false, error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        webhookSecret,
      );
    } catch (err) {
      request.log.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.status(400).send({ ok: false, error: 'Invalid signature' });
    }

    // ── Idempotency: deduplicate on event.id ────────────────────────────────
    try {
      const idem = await tryInsertStripeWebhookEvent(event.id);
      if (!idem.inserted) {
        request.log.info({ eventId: event.id }, 'Duplicate Stripe event, skipping');
        return reply.send({ ok: true, received: true, duplicate: true });
      }
      if (idem.missingTable) {
        request.log.warn('stripe_webhook_events table missing, continuing without idempotency');
      }
    } catch (err) {
      request.log.error({ err, eventId: event.id }, 'Idempotency insert failed, continuing fail-open');
    }

    request.log.info({ eventId: event.id, eventType: event.type, account: event.account }, 'Stripe webhook received');

    // ── Extract connected account context ───────────────────────────────────
    const connectedAccountId: string | null = (event.account as string | undefined) ?? null;

    try {
      switch (event.type) {
        // ── Payment completed ─────────────────────────────────────────────
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;

          // Require connected account ID for Connect sessions
          if (!connectedAccountId) {
            request.log.warn({ eventId: event.id, sessionId: session.id },
              'Missing event.account on checkout.session.completed');
            break;
          }

          if (session.payment_status !== 'paid') {
            request.log.info({ sessionId: session.id }, 'Checkout session not yet paid, skipping');
            break;
          }

          // Revenue snapshot: persist amount + currency from Stripe session
          const amountCents = session.amount_total ?? null;
          const currency = session.currency ?? null;

          const updated = await setBookingPaymentPaid(
            session.id,
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
            null, // charge_id
            new Date().toISOString(),
            connectedAccountId,
            amountCents,
            currency,
          );

          if (updated) {
            const bookingId = updated.id;
            request.log.info({ bookingId }, 'Booking marked as paid');

            // Auto-confirm booking if eligible (draft/pending → confirmed)
            let autoConfirmed = false;
            try {
              autoConfirmed = await autoConfirmBookingIfEligible(bookingId);
              if (autoConfirmed) {
                request.log.info({ bookingId }, 'Booking auto-confirmed after payment');
              }
            } catch { /* fail-open — paid is the critical state */ }

            try {
              await insertAuditEvent({
                actor_type: 'system',
                actor_id: 'stripe-webhook',
                action: 'payment_completed',
                entity_type: 'booking',
                entity_id: bookingId,
                severity: 'info',
                payload: {
                  stripe_event_id: event.id,
                  checkout_session_id: session.id,
                  payment_intent_id: updated.payment_intent_id,
                  connected_account_id: connectedAccountId,
                  auto_confirmed: autoConfirmed,
                  amount_cents: amountCents,
                  currency,
                },
              });
            } catch { /* fail-open */ }
          } else {
            request.log.info({ sessionId: session.id, connectedAccountId },
              'No booking updated (already paid, not found, or account mismatch)');
          }
          break;
        }

        // ── Checkout session expired ──────────────────────────────────────
        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (!connectedAccountId) {
            request.log.warn({ eventId: event.id, sessionId: session.id },
              'Missing event.account on checkout.session.expired');
            break;
          }

          await setBookingPaymentFailed(session.id, connectedAccountId);

          try {
            const bookingId = session.client_reference_id || session.metadata?.booking_id;
            if (bookingId) {
              await insertAuditEvent({
                actor_type: 'system',
                actor_id: 'stripe-webhook',
                action: 'payment_expired',
                entity_type: 'booking',
                entity_id: bookingId,
                severity: 'warn',
                payload: {
                  stripe_event_id: event.id,
                  reason: 'checkout_session_expired',
                  checkout_session_id: session.id,
                  connected_account_id: connectedAccountId,
                },
              });
            }
          } catch { /* fail-open */ }
          break;
        }

        // ── Checkout session async payment failed ─────────────────────────
        case 'checkout.session.async_payment_failed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (!connectedAccountId) {
            request.log.warn({ eventId: event.id, sessionId: session.id },
              'Missing event.account on checkout.session.async_payment_failed');
            break;
          }

          await setBookingPaymentFailed(session.id, connectedAccountId);

          try {
            const bookingId = session.client_reference_id || session.metadata?.booking_id;
            if (bookingId) {
              await insertAuditEvent({
                actor_type: 'system',
                actor_id: 'stripe-webhook',
                action: 'payment_async_failed',
                entity_type: 'booking',
                entity_id: bookingId,
                severity: 'warn',
                payload: {
                  stripe_event_id: event.id,
                  reason: 'checkout_session_async_payment_failed',
                  checkout_session_id: session.id,
                  connected_account_id: connectedAccountId,
                },
              });
            }
          } catch { /* fail-open */ }
          break;
        }

        // ── Payment intent failed (log only — metadata lives on session) ──
        case 'payment_intent.payment_failed': {
          const pi = event.data.object as Stripe.PaymentIntent;
          request.log.warn({
            paymentIntentId: pi.id,
            lastError: pi.last_payment_error?.message,
          }, 'Payment intent failed (log only, session events handle DB updates)');
          break;
        }

        // ── Account updated (Connect status change) ───────────────────────
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          const accountId = account.id;

          const instructor = await findInstructorByStripeAccountId(accountId);
          if (!instructor) {
            request.log.info({ accountId }, 'account.updated for unknown instructor, skipping');
            break;
          }

          // Strict mapping: enabled requires charges + payouts + details
          const newStatus: StripeConnectStatus =
            account.charges_enabled && account.payouts_enabled && account.details_submitted
              ? 'enabled'
              : account.requirements?.disabled_reason
                ? 'restricted'
                : 'pending';

          if (newStatus !== instructor.stripeConnectStatus) {
            await updateStripeConnectStatus(instructor.instructorId, newStatus);

            try {
              await insertAuditEvent({
                actor_type: 'system',
                actor_id: 'stripe-webhook',
                action: 'stripe_connect_status_changed',
                entity_type: 'instructor_profile',
                entity_id: instructor.instructorId,
                severity: 'info',
                payload: {
                  stripe_event_id: event.id,
                  stripe_account_id: accountId,
                  old_status: instructor.stripeConnectStatus,
                  new_status: newStatus,
                },
              });
            } catch { /* fail-open */ }
          }
          break;
        }

        default:
          request.log.info({ type: event.type }, 'Unhandled Stripe event type');
      }
    } catch (err) {
      // Never throw to Stripe — always return 200
      request.log.error({ err, eventId: event.id }, 'Error processing Stripe webhook event');
    }

    // Always 200 to prevent Stripe retries
    return reply.send({ ok: true, received: true });
  });
}

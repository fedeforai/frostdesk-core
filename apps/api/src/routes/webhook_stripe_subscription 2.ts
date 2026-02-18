/**
 * Stripe webhook handler for SaaS subscription lifecycle (Platform account).
 *
 * POST /webhook/stripe/subscription
 *
 * Handles:
 *   - checkout.session.completed (mode=subscription) → trialing
 *   - invoice.payment_succeeded                     → active
 *   - invoice.payment_failed                        → past_due
 *   - customer.subscription.deleted                 → canceled
 *
 * Safety:
 *   - Raw body parser scoped to this encapsulated plugin
 *   - event.id deduplication via stripe_webhook_events table
 *   - Never throws — always returns 200 to prevent Stripe retries
 *
 * Completely separate from the Connect payments webhook (/webhook/stripe).
 */
import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import {
  tryInsertStripeWebhookEvent,
  upsertInstructorSubscription,
  findInstructorSubscriptionByStripeSubId,
  insertAuditEvent,
} from '@frostdesk/db';
import type { SubscriptionStatus } from '@frostdesk/db';
import { getStripe } from '../lib/stripe_client.js';

export async function webhookStripeSubscriptionRoutes(app: FastifyInstance): Promise<void> {
  // Raw body parser — scoped to this plugin's encapsulation context.
  // Stripe signature verification requires the raw bytes, not parsed JSON.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post('/webhook/stripe/subscription', async (request, reply) => {
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
      request.log.warn({ err }, 'Stripe subscription webhook signature verification failed');
      return reply.status(400).send({ ok: false, error: 'Invalid signature' });
    }

    // ── Idempotency: deduplicate on event.id ────────────────────────────────
    try {
      const idem = await tryInsertStripeWebhookEvent(event.id);
      if (!idem.inserted) {
        request.log.info({ eventId: event.id }, 'Duplicate Stripe subscription event, skipping');
        return reply.send({ ok: true, received: true, duplicate: true });
      }
      if (idem.missingTable) {
        request.log.warn('stripe_webhook_events table missing, continuing without idempotency');
      }
    } catch (err) {
      request.log.error({ err, eventId: event.id }, 'Idempotency insert failed, continuing fail-open');
    }

    request.log.info(
      { eventId: event.id, eventType: event.type },
      'Stripe subscription webhook received',
    );

    try {
      switch (event.type) {
        // ── Checkout completed (subscription mode) ─────────────────────────
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;

          // Only handle subscription checkouts
          if (session.mode !== 'subscription') {
            request.log.info(
              { sessionId: session.id, mode: session.mode },
              'Non-subscription checkout session, skipping',
            );
            break;
          }

          const instructorId = session.metadata?.instructor_id;
          if (!instructorId) {
            request.log.warn(
              { sessionId: session.id },
              'checkout.session.completed missing instructor_id in metadata',
            );
            break;
          }

          const stripeSubscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : (session.subscription as Stripe.Subscription | null)?.id ?? null;

          const stripeCustomerId =
            typeof session.customer === 'string'
              ? session.customer
              : (session.customer as Stripe.Customer | Stripe.DeletedCustomer | null)?.id ?? null;

          // Fetch subscription details for trial info
          let trialEnd: string | null = null;
          if (stripeSubscriptionId) {
            try {
              const stripe = getStripe();
              const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
              if (sub.trial_end) {
                trialEnd = new Date(sub.trial_end * 1000).toISOString();
              }
            } catch { /* fail-open — we still have the core data */ }
          }

          await upsertInstructorSubscription({
            instructorId,
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId: process.env.STRIPE_PRICE_ID ?? null,
            status: 'trialing' as SubscriptionStatus,
            currentPeriodEnd: trialEnd, // trial_end is the effective period end during trial
            trialEnd,
          });

          request.log.info(
            { instructorId, stripeSubscriptionId },
            'Subscription set to trialing after checkout',
          );

          try {
            await insertAuditEvent({
              actor_type: 'system',
              actor_id: 'stripe-subscription-webhook',
              action: 'subscription_checkout_completed',
              entity_type: 'instructor_profile',
              entity_id: instructorId,
              severity: 'info',
              payload: {
                stripe_event_id: event.id,
                stripe_subscription_id: stripeSubscriptionId,
                stripe_customer_id: stripeCustomerId,
                status: 'trialing',
              },
            });
          } catch { /* fail-open */ }
          break;
        }

        // ── Invoice paid → active ──────────────────────────────────────────
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;

          const subId = resolveInvoiceSubscriptionId(invoice);
          if (!subId) {
            request.log.info({ invoiceId: invoice.id }, 'Invoice without subscription, skipping');
            break;
          }

          const record = await findInstructorSubscriptionByStripeSubId(subId);
          if (!record) {
            request.log.info(
              { stripeSubscriptionId: subId },
              'invoice.payment_succeeded for unknown subscription, skipping',
            );
            break;
          }

          // Use invoice.period_end as the current period end
          const currentPeriodEnd = invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null;

          await upsertInstructorSubscription({
            instructorId: record.instructorId,
            stripeCustomerId: record.stripeCustomerId,
            stripeSubscriptionId: subId,
            status: 'active' as SubscriptionStatus,
            currentPeriodEnd,
          });

          request.log.info(
            { instructorId: record.instructorId, stripeSubscriptionId: subId },
            'Subscription set to active after invoice payment',
          );

          try {
            await insertAuditEvent({
              actor_type: 'system',
              actor_id: 'stripe-subscription-webhook',
              action: 'subscription_payment_succeeded',
              entity_type: 'instructor_profile',
              entity_id: record.instructorId,
              severity: 'info',
              payload: {
                stripe_event_id: event.id,
                stripe_subscription_id: subId,
                invoice_id: invoice.id,
                status: 'active',
              },
            });
          } catch { /* fail-open */ }
          break;
        }

        // ── Invoice failed → past_due ──────────────────────────────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;

          const subId = resolveInvoiceSubscriptionId(invoice);
          if (!subId) {
            request.log.info({ invoiceId: invoice.id }, 'Invoice without subscription, skipping');
            break;
          }

          const record = await findInstructorSubscriptionByStripeSubId(subId);
          if (!record) {
            request.log.info(
              { stripeSubscriptionId: subId },
              'invoice.payment_failed for unknown subscription, skipping',
            );
            break;
          }

          await upsertInstructorSubscription({
            instructorId: record.instructorId,
            stripeCustomerId: record.stripeCustomerId,
            stripeSubscriptionId: subId,
            status: 'past_due' as SubscriptionStatus,
          });

          request.log.info(
            { instructorId: record.instructorId, stripeSubscriptionId: subId },
            'Subscription set to past_due after failed invoice',
          );

          try {
            await insertAuditEvent({
              actor_type: 'system',
              actor_id: 'stripe-subscription-webhook',
              action: 'subscription_payment_failed',
              entity_type: 'instructor_profile',
              entity_id: record.instructorId,
              severity: 'warn',
              payload: {
                stripe_event_id: event.id,
                stripe_subscription_id: subId,
                invoice_id: invoice.id,
                status: 'past_due',
              },
            });
          } catch { /* fail-open */ }
          break;
        }

        // ── Subscription deleted → canceled ────────────────────────────────
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const subId = subscription.id;

          const record = await findInstructorSubscriptionByStripeSubId(subId);
          if (!record) {
            request.log.info(
              { stripeSubscriptionId: subId },
              'customer.subscription.deleted for unknown subscription, skipping',
            );
            break;
          }

          await upsertInstructorSubscription({
            instructorId: record.instructorId,
            stripeCustomerId: record.stripeCustomerId,
            stripeSubscriptionId: subId,
            status: 'canceled' as SubscriptionStatus,
          });

          request.log.info(
            { instructorId: record.instructorId, stripeSubscriptionId: subId },
            'Subscription set to canceled',
          );

          try {
            await insertAuditEvent({
              actor_type: 'system',
              actor_id: 'stripe-subscription-webhook',
              action: 'subscription_canceled',
              entity_type: 'instructor_profile',
              entity_id: record.instructorId,
              severity: 'warn',
              payload: {
                stripe_event_id: event.id,
                stripe_subscription_id: subId,
                status: 'canceled',
              },
            });
          } catch { /* fail-open */ }
          break;
        }

        default:
          request.log.info({ type: event.type }, 'Unhandled Stripe subscription event type');
      }
    } catch (err) {
      // Never throw to Stripe — always return 200
      request.log.error(
        { err, eventId: event.id },
        'Error processing Stripe subscription webhook event',
      );
    }

    // Always 200 to prevent Stripe retries
    return reply.send({ ok: true, received: true });
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract subscription ID from an Invoice object.
 *
 * In Stripe API 2026-01-28.clover the `invoice.subscription` top-level field
 * was removed. The subscription reference is now at:
 *   invoice.parent.subscription_details.subscription
 */
function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  if (typeof sub === 'string') return sub;
  return sub.id ?? null;
}

/**
 * SaaS subscription checkout for instructors.
 *
 * POST /instructor/subscription/checkout
 *   → Creates a Stripe Checkout Session for the £49/month plan with 30-day trial.
 *   → Persists an 'incomplete' subscription row until webhook confirms.
 *
 * GET /instructor/subscription
 *   → Returns current subscription status.
 *
 * This uses the platform Stripe account (NOT Connect).
 */
import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorSubscription,
  upsertInstructorSubscription,
} from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { getStripe } from '../../lib/stripe_client.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

const INSTRUCTOR_APP_URL = process.env.INSTRUCTOR_APP_URL || 'http://localhost:3000';

async function resolveInstructor(request: { headers?: { authorization?: string } }) {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) {
    const e = new Error('Instructor profile not found');
    (e as any).code = 'NOT_FOUND';
    throw e;
  }
  return { userId, profile };
}

export async function instructorSubscriptionCheckoutRoutes(app: FastifyInstance): Promise<void> {
  // ── Create subscription checkout session ──────────────────────────────────
  app.post('/instructor/subscription/checkout', async (request, reply) => {
    try {
      const { userId, profile } = await resolveInstructor(request);
      const instructorId = profile.id;

      // Guard: already active
      const existing = await getInstructorSubscription(instructorId);
      if (existing?.status === 'active' || existing?.status === 'trialing') {
        return reply.status(409).send({
          ok: false,
          error: 'ALREADY_ACTIVE',
          message: 'Subscription is already active.',
        });
      }

      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        return reply.status(500).send({
          ok: false,
          error: 'CONFIGURATION_ERROR',
          message: 'STRIPE_PRICE_ID not configured.',
        });
      }

      const stripe = getStripe();

      // Create or reuse Stripe customer
      let customerId = existing?.stripe_customer_id as string | null;
      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: {
            instructor_id: instructorId,
            user_id: userId,
          },
        });
        customerId = customer.id;
      }

      // Create Checkout Session (platform account, NOT Connect)
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 30,
          metadata: {
            instructor_id: instructorId,
          },
        },
        metadata: {
          instructor_id: instructorId,
        },
        success_url: `${INSTRUCTOR_APP_URL}/instructor/dashboard?subscription=success`,
        cancel_url: `${INSTRUCTOR_APP_URL}/instructor/dashboard?subscription=cancelled`,
      });

      // Persist incomplete subscription row
      await upsertInstructorSubscription({
        instructorId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null, // set by webhook on confirmation
        stripePriceId: priceId,
        status: 'incomplete',
        currentPeriodEnd: null,
        trialEnd: null,
      });

      if (!session.url) {
        return reply.status(502).send({
          ok: false,
          error: 'STRIPE_SESSION_URL_MISSING',
          message: 'Stripe did not return a session URL.',
        });
      }

      return reply.send({ ok: true, url: session.url });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // ── Get current subscription status ───────────────────────────────────────
  app.get('/instructor/subscription', async (request, reply) => {
    try {
      const { profile } = await resolveInstructor(request);
      const sub = await getInstructorSubscription(profile.id);

      return reply.send({
        ok: true,
        subscription: sub
          ? {
              status: sub.status,
              stripePriceId: sub.stripe_price_id,
              currentPeriodEnd: sub.current_period_end,
              trialEnd: sub.trial_end,
            }
          : null,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}

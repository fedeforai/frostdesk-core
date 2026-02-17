/**
 * Stripe Connect Express onboarding routes.
 *
 * POST /instructor/stripe/connect         → Create Express account + return Account Link URL
 * GET  /instructor/stripe/connect/status   → Check current connect status
 * POST /instructor/stripe/connect/refresh  → Regenerate Account Link URL
 */
import type { FastifyInstance } from 'fastify';
import {
  getInstructorProfileByUserId,
  getInstructorStripeInfo,
  saveStripeAccountId,
  updateStripeConnectStatus,
  insertAuditEvent,
} from '@frostdesk/db';
import type { StripeConnectStatus } from '@frostdesk/db';
import { getUserIdFromJwt } from '../../lib/auth_instructor.js';
import { getStripe } from '../../lib/stripe_client.js';
import { normalizeError } from '../../errors/normalize_error.js';
import { mapErrorToHttp } from '../../errors/error_http_map.js';

const INSTRUCTOR_APP_BASE = process.env.INSTRUCTOR_APP_URL || 'http://localhost:3000';

async function getInstructorId(request: { headers?: { authorization?: string } }): Promise<string> {
  const userId = await getUserIdFromJwt(request);
  const profile = await getInstructorProfileByUserId(userId);
  if (!profile) {
    const e = new Error('Instructor profile not found');
    (e as any).code = 'NOT_FOUND';
    throw e;
  }
  return profile.id;
}

export async function instructorStripeConnectRoutes(app: FastifyInstance): Promise<void> {
  // ── Create Express account + Account Link ─────────────────────────────────
  app.post('/instructor/stripe/connect', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const stripe = getStripe();

      // Check if already has an account
      const existing = await getInstructorStripeInfo(instructorId);
      if (existing?.stripeAccountId && existing.stripeConnectStatus === 'enabled') {
        return reply.status(409).send({
          ok: false,
          error: 'ALREADY_CONNECTED',
          message: 'Stripe account already connected and enabled',
        });
      }

      let accountId = existing?.stripeAccountId;

      // Create Express account if not yet created
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          metadata: { instructor_id: instructorId },
        });
        accountId = account.id;
        await saveStripeAccountId(instructorId, accountId, 'pending');
      }

      // Generate Account Link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${INSTRUCTOR_APP_BASE}/instructor/settings?stripe=refresh`,
        return_url: `${INSTRUCTOR_APP_BASE}/instructor/settings?stripe=return`,
        type: 'account_onboarding',
      });

      try {
        await insertAuditEvent({
          actor_type: 'instructor',
          actor_id: instructorId,
          action: 'stripe_connect_started',
          entity_type: 'instructor_profile',
          entity_id: instructorId,
          severity: 'info',
          payload: { stripe_account_id: accountId },
        });
      } catch { /* fail-open */ }

      return reply.send({
        ok: true,
        url: accountLink.url,
        stripeAccountId: accountId,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // ── Check connect status ──────────────────────────────────────────────────
  app.get('/instructor/stripe/connect/status', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const info = await getInstructorStripeInfo(instructorId);

      if (!info?.stripeAccountId) {
        return reply.send({
          ok: true,
          status: 'not_connected' as StripeConnectStatus,
          chargesEnabled: false,
          detailsSubmitted: false,
        });
      }

      // Fetch live status from Stripe
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(info.stripeAccountId);

      // Strict mapping: enabled requires charges + payouts + details
      let newStatus: StripeConnectStatus = info.stripeConnectStatus;
      if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
        newStatus = 'enabled';
      } else if (account.requirements?.disabled_reason) {
        newStatus = 'restricted';
      } else {
        newStatus = 'pending';
      }

      // Update DB if status changed
      if (newStatus !== info.stripeConnectStatus) {
        await updateStripeConnectStatus(instructorId, newStatus);
      }

      return reply.send({
        ok: true,
        status: newStatus,
        chargesEnabled: account.charges_enabled ?? false,
        detailsSubmitted: account.details_submitted ?? false,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });

  // ── Refresh Account Link (if onboarding was interrupted) ──────────────────
  app.post('/instructor/stripe/connect/refresh', async (request, reply) => {
    try {
      const instructorId = await getInstructorId(request);
      const info = await getInstructorStripeInfo(instructorId);

      if (!info?.stripeAccountId) {
        return reply.status(412).send({
          ok: false,
          error: 'NOT_STARTED',
          message: 'No Stripe account found. Start Connect onboarding first.',
        });
      }

      if (info.stripeConnectStatus === 'enabled') {
        return reply.status(409).send({
          ok: false,
          error: 'ALREADY_CONNECTED',
          message: 'Stripe account already connected and enabled',
        });
      }

      const stripe = getStripe();
      const accountLink = await stripe.accountLinks.create({
        account: info.stripeAccountId,
        refresh_url: `${INSTRUCTOR_APP_BASE}/instructor/settings?stripe=refresh`,
        return_url: `${INSTRUCTOR_APP_BASE}/instructor/settings?stripe=return`,
        type: 'account_onboarding',
      });

      return reply.send({
        ok: true,
        url: accountLink.url,
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const status = mapErrorToHttp(normalized.error);
      return reply.status(status).send({ ok: false, error: normalized.error, message: normalized.message });
    }
  });
}

import { sql } from './client.js';

export type SubscriptionStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'incomplete'
  | 'canceled';

export async function getInstructorSubscription(instructorId: string) {
  const result = await sql`
    SELECT *
    FROM instructor_subscriptions
    WHERE instructor_id = ${instructorId}
  `;
  return result[0] ?? null;
}

/**
 * Lookup by stripe_subscription_id (for webhook event resolution).
 * Returns the instructor_id + current status, or null if not found.
 */
export async function findInstructorSubscriptionByStripeSubId(
  stripeSubscriptionId: string,
): Promise<{ instructorId: string; stripeCustomerId: string | null; status: SubscriptionStatus } | null> {
  const rows = await sql`
    SELECT instructor_id, stripe_customer_id, status
    FROM instructor_subscriptions
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return {
    instructorId: rows[0].instructor_id,
    stripeCustomerId: rows[0].stripe_customer_id ?? null,
    status: rows[0].status as SubscriptionStatus,
  };
}

export async function upsertInstructorSubscription(params: {
  instructorId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  trialEnd?: string | null;
}) {
  const {
    instructorId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId,
    status,
    currentPeriodEnd,
    trialEnd,
  } = params;

  await sql`
    INSERT INTO instructor_subscriptions (
      instructor_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      status,
      current_period_end,
      trial_end,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${stripeCustomerId ?? null},
      ${stripeSubscriptionId ?? null},
      ${stripePriceId ?? null},
      ${status},
      ${currentPeriodEnd ?? null},
      ${trialEnd ?? null},
      now()
    )
    ON CONFLICT (instructor_id)
    DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      trial_end = EXCLUDED.trial_end,
      updated_at = now()
  `;
}

/**
 * Repository for instructor Stripe Connect fields.
 * Reads/writes stripe_account_id and stripe_connect_status on instructor_profiles.
 */
import { sql } from './client.js';

export type StripeConnectStatus = 'not_connected' | 'pending' | 'enabled' | 'restricted';

export interface InstructorStripeInfo {
  instructorId: string;
  stripeAccountId: string | null;
  stripeConnectStatus: StripeConnectStatus;
}

/**
 * Returns the Stripe Connect info for an instructor.
 */
export async function getInstructorStripeInfo(instructorId: string): Promise<InstructorStripeInfo | null> {
  const rows = await sql<Array<{
    id: string;
    stripe_account_id: string | null;
    stripe_connect_status: string;
  }>>`
    SELECT id, stripe_account_id, stripe_connect_status
    FROM instructor_profiles
    WHERE id = ${instructorId}
  `;
  if (rows.length === 0) return null;
  return {
    instructorId: rows[0].id,
    stripeAccountId: rows[0].stripe_account_id,
    stripeConnectStatus: rows[0].stripe_connect_status as StripeConnectStatus,
  };
}

/**
 * Saves the Stripe account ID and connect status for an instructor.
 */
export async function saveStripeAccountId(
  instructorId: string,
  accountId: string,
  status: StripeConnectStatus,
): Promise<void> {
  await sql`
    UPDATE instructor_profiles
    SET stripe_account_id = ${accountId},
        stripe_connect_status = ${status},
        updated_at = NOW()
    WHERE id = ${instructorId}
  `;
}

/**
 * Updates only the Stripe connect status for an instructor.
 */
export async function updateStripeConnectStatus(
  instructorId: string,
  status: StripeConnectStatus,
): Promise<void> {
  await sql`
    UPDATE instructor_profiles
    SET stripe_connect_status = ${status},
        updated_at = NOW()
    WHERE id = ${instructorId}
  `;
}

/**
 * Finds instructor by their Stripe account ID (for webhook handling).
 */
export async function findInstructorByStripeAccountId(
  stripeAccountId: string,
): Promise<{ instructorId: string; stripeConnectStatus: StripeConnectStatus } | null> {
  const rows = await sql<Array<{
    id: string;
    stripe_connect_status: string;
  }>>`
    SELECT id, stripe_connect_status
    FROM instructor_profiles
    WHERE stripe_account_id = ${stripeAccountId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return {
    instructorId: rows[0].id,
    stripeConnectStatus: rows[0].stripe_connect_status as StripeConnectStatus,
  };
}

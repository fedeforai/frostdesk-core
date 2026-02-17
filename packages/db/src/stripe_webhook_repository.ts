import { sql } from './client.js';

/**
 * Attempts to insert a Stripe webhook event ID for idempotency.
 *
 * Returns:
 *   { inserted: true }               — first time seeing this event
 *   { inserted: false }              — duplicate (unique_violation 23505)
 *   { inserted: true, missingTable } — table doesn't exist yet (42P01), caller should proceed
 *
 * Any other error is re-thrown.
 */
export async function tryInsertStripeWebhookEvent(
  eventId: string,
): Promise<{ inserted: boolean; missingTable?: boolean }> {
  try {
    await sql`
      INSERT INTO stripe_webhook_events (event_id)
      VALUES (${eventId})
    `;
    return { inserted: true };
  } catch (err: any) {
    const code = err?.code;

    // unique_violation → duplicate
    if (code === '23505') return { inserted: false };

    // undefined_table → table hasn't been migrated yet
    if (code === '42P01') return { inserted: true, missingTable: true };

    throw err;
  }
}

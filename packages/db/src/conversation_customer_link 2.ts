import { sql } from './client.js';

/**
 * Links a conversation to a customer profile.
 *
 * Idempotent: only sets customer_id when it's currently NULL.
 * Never overwrites an existing link (no destructive mutation).
 *
 * @returns true if the link was set, false if already linked.
 */
export async function linkConversationToCustomer(
  conversationId: string,
  customerId: string,
): Promise<boolean> {
  const result = await sql`
    UPDATE conversations
    SET customer_id = ${customerId}
    WHERE id = ${conversationId}
      AND customer_id IS NULL
  `;
  return (result as any).count > 0;
}

/**
 * Get the customer_id for a conversation (if linked).
 */
export async function getConversationCustomerId(
  conversationId: string,
): Promise<string | null> {
  const rows = await sql<{ customer_id: string | null }[]>`
    SELECT customer_id
    FROM conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `;
  return rows[0]?.customer_id ?? null;
}

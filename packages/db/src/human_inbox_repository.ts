import { sql } from './client.js';

/**
 * Human Inbox Repository (READ-ONLY)
 * 
 * WHAT IT DOES:
 * - SELECTs conversation data with last message information
 * - Aggregates last message per conversation
 * - Applies optional filters for status and channel
 * - Returns raw rows with no business logic
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT / UPDATE / DELETE
 * - No admin guard
 * - No business logic
 * - No side effects
 * - No mutation
 */

export interface HumanInboxRow {
  conversation_id: string;
  channel: string;
  status: string;
  last_message_direction: 'inbound' | 'outbound' | null;
  last_message_text: string | null;
  last_message_created_at: string | null;
  last_activity_at: string;
  /** BookingDecision v1 — escalation visibility (read-only). Derived from latest ai_snapshot: relevant + booking intent + low confidence. */
  require_escalation: boolean | null;
  /** Latest ai_snapshot per conversation; audit only. No decision logic. */
  intent_confidence: number | null;
  /** Latest ai_snapshot per conversation; audit only. No decision logic. */
  relevance_confidence: number | null;
}

/**
 * Retrieves human inbox rows (READ-ONLY).
 * 
 * Returns conversations with their last message information.
 * 
 * @param params - Optional filters for status and channel
 * @returns Array of human inbox rows, ordered by last_activity_at DESC
 */
export async function getHumanInboxRows(
  params?: {
    status?: string;
    channel?: string;
  }
): Promise<HumanInboxRow[]> {
  const { status, channel } = params || {};

  // Use DISTINCT ON to get the last message per conversation
  // Compute last_activity_at as MAX(messages.created_at) or conversations.created_at
  // Note: Following task assumptions that conversations.status, conversations.channel, and messages.message_text exist
  const result = await sql<HumanInboxRow[]>`
    WITH last_messages AS (
      SELECT DISTINCT ON (conversation_id)
        conversation_id,
        direction AS last_message_direction,
        message_text AS last_message_text,
        created_at AS last_message_created_at
      FROM messages
      WHERE conversation_id IS NOT NULL
      ORDER BY conversation_id, created_at DESC
    ),
    conversation_activity AS (
      SELECT
        c.id AS conversation_id,
        c.channel,
        c.status,
        COALESCE(MAX(m.created_at), c.created_at) AS last_activity_at
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id, c.channel, c.status, c.created_at
    )
    SELECT
      ca.conversation_id,
      ca.channel,
      ca.status,
      lm.last_message_direction,
      lm.last_message_text,
      lm.last_message_created_at,
      ca.last_activity_at,
      (SELECT (s.relevant = true AND s.intent IN ('NEW_BOOKING', 'RESCHEDULE') AND (s.intent_confidence < 0.7 OR s.relevance_confidence < 0.7)) FROM ai_snapshots s WHERE s.conversation_id = ca.conversation_id ORDER BY s.created_at DESC LIMIT 1) AS require_escalation,
      (SELECT s.intent_confidence FROM ai_snapshots s WHERE s.conversation_id = ca.conversation_id ORDER BY s.created_at DESC LIMIT 1) AS intent_confidence,
      (SELECT s.relevance_confidence FROM ai_snapshots s WHERE s.conversation_id = ca.conversation_id ORDER BY s.created_at DESC LIMIT 1) AS relevance_confidence
    FROM conversation_activity ca
    LEFT JOIN last_messages lm ON lm.conversation_id = ca.conversation_id
    WHERE 1=1
      ${status ? sql`AND ca.status = ${status}` : sql``}
      ${channel ? sql`AND ca.channel = ${channel}` : sql``}
    ORDER BY ca.last_activity_at DESC
  `;

  return result;
}

import { sql } from './client.js';

/**
 * Instructor Inbox Repository (READ-ONLY)
 *
 * Returns conversations for a single instructor with last message and needs_human signal.
 * Same data shape as human inbox; filtered by instructor_id. No writes, no side effects.
 * needs_human: true only when latest ai_snapshot says escalation AND no outbound message
 * after that snapshot (FEATURE 2.8: instructor reply closes the loop).
 */

export type InstructorInboxItem = {
  conversation_id: string;
  customer_identifier: string;
  channel: string;
  status: string;
  last_message: {
    direction: 'inbound' | 'outbound';
    text: string;
    created_at: string;
  } | null;
  last_activity_at: string;
  needs_human: boolean;
};

type InstructorInboxRow = {
  conversation_id: string;
  customer_identifier: string;
  channel: string;
  status: string;
  last_message_direction: 'inbound' | 'outbound' | null;
  last_message_text: string | null;
  last_message_created_at: string | null;
  last_activity_at: string;
  needs_human: boolean;
};

/**
 * Gets instructor inbox: conversations for this instructor with last message and needs_human.
 * Read-only. Filtered by instructor_id. Ordered by last_activity_at DESC.
 *
 * @param instructorId - Instructor ID (instructor_profiles.id, UUID)
 * @returns List of inbox items
 */
export async function getInstructorInbox(
  instructorId: string
): Promise<InstructorInboxItem[]> {
  const result = await sql<InstructorInboxRow[]>`
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
        c.instructor_id,
        c.customer_identifier,
        c.channel,
        c.status,
        COALESCE(MAX(m.created_at), c.created_at) AS last_activity_at
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      GROUP BY c.id, c.instructor_id, c.customer_identifier, c.channel, c.status, c.created_at
    )
    SELECT
      ca.conversation_id,
      ca.customer_identifier,
      ca.channel,
      ca.status,
      lm.last_message_direction,
      lm.last_message_text,
      lm.last_message_created_at,
      ca.last_activity_at,
      COALESCE((
        SELECT (s.relevant = true AND s.intent IN ('NEW_BOOKING', 'RESCHEDULE')
          AND (s.intent_confidence < 0.7 OR s.relevance_confidence < 0.7)
          AND NOT EXISTS (
            SELECT 1 FROM messages m
            WHERE m.conversation_id = ca.conversation_id
              AND m.direction = 'outbound'
              AND m.created_at > s.created_at
          ))
        FROM ai_snapshots s
        WHERE s.conversation_id = ca.conversation_id
        ORDER BY s.created_at DESC
        LIMIT 1
      ), false) AS needs_human
    FROM conversation_activity ca
    LEFT JOIN last_messages lm ON lm.conversation_id = ca.conversation_id
    WHERE ca.instructor_id = ${instructorId}::uuid
    ORDER BY ca.last_activity_at DESC
  `;

  return result.map((row) => ({
    conversation_id: row.conversation_id,
    customer_identifier: row.customer_identifier ?? '',
    channel: row.channel,
    status: row.status,
    last_message:
      row.last_message_direction != null &&
      row.last_message_text != null &&
      row.last_message_created_at != null
        ? {
            direction: row.last_message_direction as 'inbound' | 'outbound',
            text: row.last_message_text,
            created_at: row.last_message_created_at,
          }
        : null,
    last_activity_at: row.last_activity_at,
    needs_human: row.needs_human ?? false,
  }));
}

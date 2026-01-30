import { sql } from './client.js';

/**
 * Instructor Reply Repository (FEATURE 2.8)
 *
 * DB-only: insert instructor outbound message and "mark human handled".
 * No business logic, no env, deterministic.
 * Ownership enforced by conversation.instructor_id.
 */

export type InstructorReplyMessage = {
  id: string;
  conversation_id: string;
  direction: 'outbound';
  text: string;
  created_at: string;
};

export type InsertInstructorReplyParams = {
  conversationId: string;
  instructorId: string;
  text: string;
};

/**
 * Inserts an instructor outbound message for a conversation.
 * Only succeeds if conversation belongs to instructor_id (ownership).
 *
 * @param params - conversationId, instructorId, text
 * @returns Inserted message (id, conversation_id, direction, text, created_at)
 * @throws Error with code CONVERSATION_NOT_FOUND if conversation does not exist or not owned
 */
export async function insertInstructorReply(
  params: InsertInstructorReplyParams
): Promise<InstructorReplyMessage> {
  const { conversationId, instructorId, text } = params;

  const rows = await sql<Array<{
    id: string;
    conversation_id: string;
    direction: string;
    message_text: string;
    created_at: string;
  }>>`
    INSERT INTO messages (
      conversation_id,
      channel,
      direction,
      message_text,
      sender_identity,
      created_at
    )
    SELECT
      c.id,
      c.channel,
      'outbound',
      ${text},
      'instructor',
      NOW()
    FROM conversations c
    WHERE c.id = ${conversationId}::uuid
      AND c.instructor_id = ${instructorId}::uuid
    RETURNING id, conversation_id, direction, message_text, created_at
  `;

  if (rows.length === 0) {
    const err = new Error('CONVERSATION_NOT_FOUND');
    (err as Error & { code: string }).code = 'CONVERSATION_NOT_FOUND';
    throw err;
  }

  const row = rows[0];
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    direction: 'outbound',
    text: row.message_text,
    created_at: row.created_at,
  };
}

/**
 * Marks conversation as human-handled (needs_human closed).
 * No schema change: inbox query derives needs_human from "outbound after latest escalation snapshot".
 * No-op for audit trail / future use (e.g. human_handled_at column).
 *
 * @param _conversationId - Conversation ID (unused when needs_human is derived from messages)
 */
export async function markConversationHumanHandled(
  _conversationId: string
): Promise<void> {
  // No-op: needs_human is derived in instructor_inbox_repository from
  // "latest ai_snapshot escalation AND no outbound message after that snapshot".
  // Inserting the reply is sufficient; next inbox fetch will show needs_human = false.
}

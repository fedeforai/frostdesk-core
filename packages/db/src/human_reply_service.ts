import { getConversationById } from './conversation_repository.js';
import { sql } from './client.js';

export interface SendHumanReplyParams {
  conversationId: string;
  authorUserId: string;
  content: string;
}

export interface SendHumanReplyResult {
  messageId: string;
}

/**
 * Sends a human reply to a conversation.
 * 
 * Verifies conversation exists, then persists a message with:
 * - direction = 'outbound'
 * - role = 'human'
 * - content = params.content
 * 
 * Does NOT modify conversation state.
 * Does NOT call orchestrator or AI.
 * 
 * @param params - Reply parameters
 * @returns Message ID
 * @throws Error if conversation not found or database error
 */
export async function sendHumanReply(
  params: SendHumanReplyParams
): Promise<SendHumanReplyResult> {
  const { conversationId, authorUserId, content } = params;

  // Verify conversation exists
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`);
  }

  // Persist message with direction='outbound', message_text (canonical schema; no role column)
  const result = await sql<Array<{ id: string }>>`
    INSERT INTO messages (conversation_id, direction, message_text, channel, raw_payload, created_at)
    VALUES (${conversationId}, 'outbound', ${content}, 'whatsapp', '{}', NOW())
    RETURNING id
  `;

  if (result.length === 0) {
    throw new Error('Failed to create message: no row returned');
  }

  return {
    messageId: result[0].id,
  };
}

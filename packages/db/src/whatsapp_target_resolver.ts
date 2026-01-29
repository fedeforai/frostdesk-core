import { sql } from './client.js';

export class WhatsAppTargetNotFoundError extends Error {
  code = 'WHATSAPP_TARGET_NOT_FOUND' as const;

  constructor(conversationId: string) {
    super(`WhatsApp target not found for conversation: ${conversationId}`);
    this.name = 'WhatsAppTargetNotFoundError';
  }
}

/**
 * Resolves the WhatsApp recipient phone for outbound send (read-only).
 *
 * SOURCE OF TRUTH: messages.sender_identity of the latest inbound message.
 * Rule V1: Recipient = last inbound sender_identity for the conversation.
 *
 * @param conversationId - Conversation UUID
 * @returns { to: string } WhatsApp phone (no +)
 * @throws WhatsAppTargetNotFoundError if no inbound WhatsApp message exists
 */
export async function resolveWhatsAppTarget(conversationId: string): Promise<{ to: string }> {
  const result = await sql<Array<{ sender_identity: string }>>`
    SELECT sender_identity
    FROM messages
    WHERE conversation_id = ${conversationId}::uuid
      AND channel = 'whatsapp'
      AND direction = 'inbound'
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new WhatsAppTargetNotFoundError(conversationId);
  }

  const to = result[0].sender_identity;
  if (typeof to !== 'string' || to.trim().length === 0) {
    throw new WhatsAppTargetNotFoundError(conversationId);
  }

  return { to: to.trim() };
}

import { sql } from './client.js';
import { listInboundMessagesByConversation } from './inbound_messages_repository.js';
import type { InboundMessage } from './inbound_messages_repository.js';

export async function listInboundMessagesService(
  conversationId?: string,
  limit?: number
): Promise<InboundMessage[]> {
  if (conversationId) {
    return listInboundMessagesByConversation(conversationId, limit);
  }

  const result = await sql<InboundMessage[]>`
    SELECT 
      id,
      channel,
      conversation_id,
      external_message_id,
      sender_identity,
      message_type,
      message_text,
      raw_payload,
      received_at,
      created_at
    FROM inbound_messages
    ORDER BY received_at DESC
    LIMIT ${limit ?? 100}
  `;

  return result;
}

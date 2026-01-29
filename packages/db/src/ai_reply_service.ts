import { sql } from './client.js';

export async function sendAIReply(params: {
  conversationId: string;
  replyText: string;
}): Promise<void> {
  const { conversationId, replyText } = params;

  const existing = await sql<Array<{ id: string }>>`
    SELECT id
    FROM messages
    WHERE conversation_id = ${conversationId}
      AND direction = 'outbound'
      AND sender_identity = 'ai'
    LIMIT 1
  `;

  if (existing.length > 0) {
    return;
  }

  await sql`
    INSERT INTO messages (
      conversation_id,
      channel,
      direction,
      message_text,
      sender_identity,
      external_message_id,
      raw_payload,
      created_at
    )
    VALUES (
      ${conversationId},
      'whatsapp',
      'outbound',
      ${replyText},
      'ai',
      NULL,
      NULL,
      NOW()
    )
  `;
}

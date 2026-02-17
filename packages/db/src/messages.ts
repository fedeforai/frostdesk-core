import { sql } from './client.js';

type InsertMessageInput = {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Inserts a message using canonical schema (direction, message_text, channel).
 * Maps role 'user' → inbound, 'assistant' → outbound.
 */
export async function insertMessage({
  conversation_id,
  role,
  content
}: InsertMessageInput) {
  const direction = role === 'user' ? 'inbound' : 'outbound';
  const result = await sql`
    INSERT INTO messages (conversation_id, direction, message_text, channel, created_at)
    VALUES (${conversation_id}, ${direction}, ${content}, 'whatsapp', NOW())
    RETURNING *
  `;

  return result[0];
}

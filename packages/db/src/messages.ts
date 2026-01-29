import { sql } from './client.js';

type InsertMessageInput = {
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
};

export async function insertMessage({
  conversation_id,
  role,
  content
}: InsertMessageInput) {
  const result = await sql`
    insert into messages (conversation_id, role, content)
    values (${conversation_id}, ${role}, ${content})
    returning *
  `;

  return result[0];
}

import { sql } from './client.js';

export type MessageDirection = 'inbound' | 'outbound';

export interface AdminMessageSummary {
  id: string;
  conversation_id: string;
  instructor_id: number | null;
  direction: MessageDirection;
  role: string | null;
  content: string;
  created_at: string;
}

export interface ListAllMessagesParams {
  limit: number;
  offset: number;
  conversationId?: string;
  instructorId?: string;
  direction?: 'inbound' | 'outbound';
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Lists all messages across all conversations (read-only).
 * Ordered by created_at DESC.
 * 
 * @param params - Query parameters with pagination and optional filters
 * @returns Array of message summaries
 */
export async function listAllMessages(
  params: ListAllMessagesParams
): Promise<AdminMessageSummary[]> {
  const { limit, offset, conversationId, instructorId, direction, dateFrom, dateTo } = params;

  // Query messages with optional join to conversations for instructor_id if needed
  // If instructor_id is directly in messages table, use it; otherwise join with conversations
  const result = await sql<AdminMessageSummary[]>`
    SELECT 
      m.id,
      m.conversation_id,
      COALESCE(m.instructor_id, c.instructor_id) as instructor_id,
      m.direction,
      m.role,
      m.content,
      m.created_at
    FROM messages m
    LEFT JOIN conversations c ON m.conversation_id = c.id
    WHERE 1=1
      ${conversationId ? sql`AND m.conversation_id = ${conversationId}` : sql``}
      ${instructorId ? sql`AND COALESCE(m.instructor_id, c.instructor_id) = ${Number(instructorId)}` : sql``}
      ${direction ? sql`AND m.direction = ${direction}` : sql``}
      ${dateFrom ? sql`AND m.created_at >= ${dateFrom}` : sql``}
      ${dateTo ? sql`AND m.created_at <= ${dateTo}` : sql``}
    ORDER BY m.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result;
}

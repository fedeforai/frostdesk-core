import { sql } from './client.js';

export interface ConversationSummary {
  id: string;
  instructor_id: number;
  customer_name: string;
  customer_phone: string;
  source: string;
  status: string;
  handoff_to_human: boolean;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  created_at: string;
}

export interface ListAllConversationsParams {
  limit: number;
  offset: number;
  instructorId?: string;
  status?: string;
}

/**
 * Lists all conversations across all instructors (read-only).
 * Ordered by created_at DESC.
 * 
 * @param params - Query parameters with pagination and optional filters
 * @returns Array of conversation summaries
 */
export async function listAllConversations(
  params: ListAllConversationsParams
): Promise<ConversationSummary[]> {
  const { limit, offset, instructorId, status } = params;

  const result = await sql<ConversationSummary[]>`
    SELECT id, instructor_id, customer_name, customer_phone, source, status, handoff_to_human, last_inbound_at, last_outbound_at, created_at
    FROM conversation_threads
    WHERE 1=1
      ${instructorId ? sql`AND instructor_id = ${Number(instructorId)}` : sql``}
      ${status ? sql`AND status = ${status}` : sql``}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result;
}

export interface HumanInboxConversation {
  id: string;
  customer_identifier: string;
  instructor_id: number;
  created_at: string;
}

export interface ListHumanInboxConversationsParams {
  limit: number;
  offset: number;
}

/**
 * Lists all conversations (read-only).
 * Ordered by created_at DESC.
 * 
 * @param params - Query parameters with pagination
 * @returns Array of human inbox conversations
 */
export async function listHumanInboxConversations(
  params: ListHumanInboxConversationsParams
): Promise<HumanInboxConversation[]> {
  const { limit, offset } = params;

  const result = await sql<HumanInboxConversation[]>`
    SELECT id, customer_identifier, instructor_id, created_at
    FROM conversation_threads
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  return result;
}

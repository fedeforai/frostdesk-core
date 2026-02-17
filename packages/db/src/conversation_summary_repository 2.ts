/**
 * Conversation Summary Repository
 *
 * CRUD for the rolling AI summary stored on the conversations table.
 * Summary is additive-only: messages are never deleted or truncated.
 * If any query fails, callers must handle gracefully (fail-open).
 */

import { sql } from './client.js';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ConversationSummary {
  conversationId: string;
  aiSummary: string | null;
  aiSummaryJson: Record<string, unknown> | null;
  aiSummaryUpdatedAt: string | null;
  aiSummaryMessageId: string | null;
  aiSummaryVersion: number;
}

export interface UpdateConversationSummaryParams {
  conversationId: string;
  summaryText: string;
  summaryJson: Record<string, unknown>;
  messageId: string;
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * Gets the current AI summary for a conversation.
 * Returns null if conversation not found or columns don't exist yet.
 */
export async function getConversationSummary(
  conversationId: string,
): Promise<ConversationSummary | null> {
  try {
    const rows = await sql<Array<{
      id: string;
      ai_summary: string | null;
      ai_summary_json: Record<string, unknown> | null;
      ai_summary_updated_at: string | null;
      ai_summary_message_id: string | null;
      ai_summary_version: number;
    }>>`
      SELECT
        id,
        ai_summary,
        ai_summary_json,
        ai_summary_updated_at,
        ai_summary_message_id,
        ai_summary_version
      FROM conversations
      WHERE id = ${conversationId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const r = rows[0];
    return {
      conversationId: r.id,
      aiSummary: r.ai_summary,
      aiSummaryJson: r.ai_summary_json,
      aiSummaryUpdatedAt: r.ai_summary_updated_at,
      aiSummaryMessageId: r.ai_summary_message_id,
      aiSummaryVersion: r.ai_summary_version ?? 0,
    };
  } catch {
    // Column may not exist if migration not applied — fail-open
    return null;
  }
}

/**
 * Gets the count of messages since the last summary update.
 * Used to decide whether to regenerate the summary.
 */
export async function getMessageCountSinceLastSummary(
  conversationId: string,
): Promise<number> {
  try {
    const rows = await sql<Array<{ cnt: string }>>`
      SELECT COUNT(*)::text AS cnt
      FROM messages m
      WHERE m.conversation_id = ${conversationId}::uuid
        AND m.created_at > COALESCE(
          (SELECT ai_summary_updated_at FROM conversations WHERE id = ${conversationId}::uuid),
          '1970-01-01'::timestamptz
        )
    `;
    return Number(rows[0]?.cnt ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Gets recent messages for the summary window (last N inbound + outbound).
 */
export async function getRecentMessagesForSummary(
  conversationId: string,
  limit: number = 8,
): Promise<Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }>> {
  try {
    const rows = await sql<Array<{
      direction: string;
      body: string;
      created_at: string;
    }>>`
      SELECT direction, body, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}::uuid
        AND body IS NOT NULL
        AND body != ''
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    // Reverse to chronological order
    return rows.reverse().map((r) => ({
      role: r.direction === 'inbound' ? 'user' as const : 'assistant' as const,
      content: r.body,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

// ── Writes ───────────────────────────────────────────────────────────────────

/**
 * Persists a new AI summary for the conversation.
 * Increments ai_summary_version monotonically.
 *
 * @returns The new version number, or null on failure.
 */
export async function updateConversationSummary(
  params: UpdateConversationSummaryParams,
): Promise<number | null> {
  try {
    const rows = await sql<Array<{ ai_summary_version: number }>>`
      UPDATE conversations
      SET
        ai_summary = ${params.summaryText},
        ai_summary_json = ${JSON.stringify(params.summaryJson)}::jsonb,
        ai_summary_updated_at = now(),
        ai_summary_message_id = ${params.messageId}::uuid,
        ai_summary_version = ai_summary_version + 1
      WHERE id = ${params.conversationId}::uuid
      RETURNING ai_summary_version
    `;

    return rows[0]?.ai_summary_version ?? null;
  } catch {
    // Fail-open: summary persistence is never critical
    return null;
  }
}

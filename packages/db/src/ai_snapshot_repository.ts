import { sql } from './client.js';

/**
 * AI Snapshot Repository (PILOT-SAFE)
 * 
 * Persists AI classification snapshots for audit and observability.
 * 
 * WHAT IT DOES:
 * - Saves relevance and intent classification results
 * - Provides read-only access to snapshots
 * - No side effects on conversations or messages
 * 
 * WHAT IT DOES NOT DO:
 * - No conversation state mutation
 * - No message state changes
 * - No automation triggers
 */

export interface AISnapshot {
  id: string;
  message_id: string;
  conversation_id: string;
  channel: string;
  relevant: boolean;
  relevance_confidence: number;
  relevance_reason?: string | null;
  intent?: string | null;
  intent_confidence?: number | null;
  model: string;
  created_at: string;
  // Loop A: computed in-memory, NOT persisted as DB columns (no schema change).
  confidence_band?: string | null;
  timed_out?: boolean;
}

export interface InsertAISnapshotParams {
  message_id: string;
  conversation_id: string;
  channel: 'whatsapp';
  relevant: boolean;
  relevance_confidence: number;
  relevance_reason?: 'OUT_OF_DOMAIN' | 'SMALL_TALK' | 'SPAM' | null;
  intent?: 'NEW_BOOKING' | 'RESCHEDULE' | 'CANCEL' | 'INFO_REQUEST' | null;
  intent_confidence?: number | null;
  model: string;
  /** Optional: resolved automatically from conversation if omitted. */
  instructor_id?: string | null;
  // Loop A: in-memory enrichment. Not persisted to snapshot table (no migration).
  confidence_band?: string | null;
  timed_out?: boolean;
}

/**
 * Inserts an AI classification snapshot.
 * 
 * Idempotent: if snapshot already exists for message_id, returns existing id.
 * 
 * @param params - Snapshot parameters
 * @returns Snapshot id
 */
export async function insertAISnapshot(
  params: InsertAISnapshotParams
): Promise<string> {
  // Check if snapshot already exists (idempotency)
  const existing = await sql<Array<{ id: string }>>`
    SELECT id
    FROM ai_snapshots
    WHERE message_id = ${params.message_id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Resolve instructor_id from conversation if not provided
  let instructorId = params.instructor_id ?? null;
  if (!instructorId) {
    const convRow = await sql<Array<{ instructor_id: string }>>`
      SELECT instructor_id::text FROM conversations WHERE id = ${params.conversation_id}::uuid LIMIT 1
    `;
    instructorId = convRow.length > 0 ? convRow[0].instructor_id : null;
  }
  if (!instructorId) {
    throw new Error(`Cannot resolve instructor_id for conversation ${params.conversation_id}`);
  }

  // Insert new snapshot (classification only; no decision fields persisted)
  const relevanceReason = params.relevance_reason ?? null;
  const result = await Promise.resolve(
    sql<Array<{ id: string }>>`
    INSERT INTO ai_snapshots (
      message_id,
      conversation_id,
      instructor_id,
      channel,
      relevant,
      relevance_confidence,
      relevance_reason,
      intent,
      intent_confidence,
      model,
      created_at
    ) VALUES (
      ${params.message_id}::uuid,
      ${params.conversation_id}::uuid,
      ${instructorId}::uuid,
      ${params.channel},
      ${params.relevant},
      ${params.relevance_confidence},
      ${relevanceReason},
      ${params.intent ?? null},
      ${params.intent_confidence ?? null},
      ${params.model},
      NOW()
    )
    RETURNING id
  `,
  );

  if (result.length === 0) {
    throw new Error('Failed to insert AI snapshot: no row returned');
  }

  return result[0].id;
}

/**
 * Finds AI snapshot by message ID.
 * 
 * @param messageId - Message UUID
 * @returns Snapshot or null if not found
 */
export async function findAISnapshotByMessageId(
  messageId: string
): Promise<AISnapshot | null> {
  const result = await sql<AISnapshot[]>`
    SELECT 
      id,
      message_id,
      conversation_id,
      channel,
      relevant,
      relevance_confidence,
      relevance_reason,
      intent,
      intent_confidence,
      model,
      created_at
    FROM ai_snapshots
    WHERE message_id = ${messageId}::uuid
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Lists AI snapshots for a conversation.
 * 
 * @param conversationId - Conversation UUID
 * @returns Array of snapshots ordered by created_at DESC
 */
export async function listAISnapshotsByConversation(
  conversationId: string
): Promise<AISnapshot[]> {
  const result = await sql<AISnapshot[]>`
    SELECT 
      id,
      message_id,
      conversation_id,
      channel,
      relevant,
      relevance_confidence,
      relevance_reason,
      intent,
      intent_confidence,
      model,
      created_at
    FROM ai_snapshots
    WHERE conversation_id = ${conversationId}::uuid
    ORDER BY created_at DESC
  `;

  return result;
}

/**
 * Lists AI snapshots for a conversation by conversation_id (read-only).
 * Raw rows, no transformation. Used by Admin read model.
 *
 * @param conversationId - Conversation UUID
 * @returns Array of snapshots ordered by created_at ASC; empty array if none
 */
export async function listAISnapshotsByConversationId(
  conversationId: string
): Promise<AISnapshot[]> {
  const result = await sql<AISnapshot[]>`
    SELECT
      id,
      message_id,
      conversation_id,
      channel,
      relevant,
      relevance_confidence,
      relevance_reason,
      intent,
      intent_confidence,
      model,
      created_at
    FROM ai_snapshots
    WHERE conversation_id = ${conversationId}::uuid
    ORDER BY created_at ASC
  `;
  return result;
}

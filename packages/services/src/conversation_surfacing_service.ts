import { sql } from '../../db/src/client.js';

export interface ConversationTimelineMessage {
  message_id: string;
  sender_identity: string;
  message_type: string;
  message_text: string | null;
  received_at: string;
  intent: string | null;
  confidence: number | null;
  model: string | null;
}

export interface ConversationTimeline {
  conversation_id: string;
  channel: string;
  external_identity: string;
  messages: ConversationTimelineMessage[];
}

/**
 * Surfaces a conversation timeline by JOINING existing tables.
 * 
 * WHAT IT DOES:
 * - SELECTs conversation by conversation_id
 * - JOINs channel_identity_mapping to get channel and external_identity
 * - JOINs inbound_messages to get message timeline
 * - Orders messages by received_at ASC (chronological)
 * - Returns READ-ONLY timeline DTO
 * - If no messages → returns empty messages array
 * - Deterministic output (same input → same output)
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No DELETE
 * - No routing logic
 * - No AI calls
 * - No automation
 * - No inference
 * - No state derivation
 * - No side effects
 */
export async function getConversationTimeline(
  conversationId: string
): Promise<ConversationTimeline | null> {
  const result = await sql<{
    conversation_id: string;
    channel: string | null;
    external_identity: string | null;
    message_id: string | null;
    sender_identity: string | null;
    message_type: string | null;
    message_text: string | null;
    received_at: string | null;
    intent: string | null;
    confidence: number | null;
    model: string | null;
  }[]>`
    SELECT 
      c.id as conversation_id,
      (SELECT m.channel FROM channel_identity_mapping m WHERE m.conversation_id = c.id LIMIT 1) as channel,
      (SELECT m.external_identity FROM channel_identity_mapping m WHERE m.conversation_id = c.id LIMIT 1) as external_identity,
      im.id as message_id,
      im.sender_identity,
      im.message_type,
      im.message_text,
      im.received_at,
      (mm.value->>'intent')::text AS intent,
      (mm.value->>'confidence')::numeric AS confidence,
      (mm.value->>'model')::text AS model
    FROM conversations c
    LEFT JOIN inbound_messages im ON im.conversation_id = c.id
    LEFT JOIN message_metadata mm ON mm.message_id = im.id AND mm.key = 'intent_classification'
    WHERE c.id = ${conversationId}
    ORDER BY im.received_at ASC NULLS LAST
  `;

  if (result.length === 0) {
    return null;
  }

  const firstRow = result[0];
  const channel = firstRow.channel || '';
  const externalIdentity = firstRow.external_identity || '';

  const messages: ConversationTimelineMessage[] = result
    .filter(row => row.message_id !== null && row.received_at !== null)
    .map(row => ({
      message_id: row.message_id!,
      sender_identity: row.sender_identity!,
      message_type: row.message_type!,
      message_text: row.message_text,
      received_at: row.received_at!,
      intent: row.intent,
      confidence: row.confidence,
      model: row.model,
    }));

  return {
    conversation_id: firstRow.conversation_id,
    channel,
    external_identity: externalIdentity,
    messages,
  };
}

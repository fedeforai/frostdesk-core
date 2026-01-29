// OUT OF PILOT SCOPE – DO NOT USE IN v1
// PILOT MODE v1: This repository is LEGACY and should NOT be used by the pilot webhook.
// The pilot webhook MUST use persistInboundMessageWithInboxBridge from message_repository.ts.
// This repository requires message_type which is not in the pilot schema.

import { sql } from './client.js';

export interface InboundMessage {
  id: string;
  channel: string;
  conversation_id: string;
  external_message_id: string;
  sender_identity: string;
  message_type: string; // OUT OF PILOT SCOPE
  message_text: string | null;
  raw_payload: any;
  received_at: string;
  created_at: string;
}

export interface InsertInboundMessageParams {
  channel: string;
  conversation_id: string;
  external_message_id: string;
  sender_identity: string;
  message_type: string; // OUT OF PILOT SCOPE
  message_text: string | null;
  raw_payload: any;
  received_at: string;
}

/**
 * Inserts a new inbound message.
 * 
 * WHAT IT DOES:
 * - INSERTs new inbound message with all provided fields
 * - Relies on UNIQUE (channel, external_message_id) constraint
 * - Returns inserted row id
 * - Throws on uniqueness violation (channel + external_message_id already exists)
 * 
 * WHAT IT DOES NOT DO:
 * - No UPDATE
 * - No DELETE
 * - No UPSERT
 * - No conversation creation
 * - No identity resolution
 * - No routing
 * - No side effects
 */
export async function insertInboundMessage(
  params: InsertInboundMessageParams
): Promise<string> {
  const result = await sql<{ id: string }[]>`
    INSERT INTO inbound_messages (
      channel,
      conversation_id,
      external_message_id,
      sender_identity,
      message_type,
      message_text,
      raw_payload,
      received_at
    ) VALUES (
      ${params.channel},
      ${params.conversation_id},
      ${params.external_message_id},
      ${params.sender_identity},
      ${params.message_type},
      ${params.message_text},
      ${JSON.stringify(params.raw_payload)}::jsonb,
      ${params.received_at}
    )
    RETURNING id
  `;

  return result[0].id;
}

/**
 * Finds an inbound message by external message ID.
 * 
 * WHAT IT DOES:
 * - SELECTs message by (channel, external_message_id)
 * - Returns message row or null if not found
 * - Used for idempotency checks
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No DELETE
 * - No routing
 * - No side effects
 * - No state mutations
 */
export async function findInboundMessageByExternalId(
  channel: string,
  externalMessageId: string
): Promise<InboundMessage | null> {
  // PILOT MODE v1: message_type removed from SELECT (column not in schema)
  const result = await sql<Array<{
    id: string;
    channel: string;
    conversation_id: string;
    external_message_id: string;
    sender_identity: string;
    message_text: string | null;
    raw_payload: any;
    received_at: string;
    created_at: string;
  }>>`
    SELECT 
      id,
      channel,
      conversation_id,
      external_message_id,
      sender_identity,
      message_text,
      raw_payload,
      received_at,
      created_at
    FROM inbound_messages
    WHERE channel = ${channel}
      AND external_message_id = ${externalMessageId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  // Map result to InboundMessage interface (with message_type as null for pilot compatibility)
  const row = result[0];
  return {
    id: row.id,
    channel: row.channel,
    conversation_id: row.conversation_id,
    external_message_id: row.external_message_id,
    sender_identity: row.sender_identity,
    message_type: 'text', // PILOT MODE: hardcoded, column not in schema
    message_text: row.message_text,
    raw_payload: row.raw_payload,
    received_at: row.received_at,
    created_at: row.created_at,
  };
}

/**
 * Lists inbound messages for a conversation.
 * 
 * WHAT IT DOES:
 * - SELECTs messages by conversation_id
 * - Orders by received_at ASC (chronological)
 * - Supports optional limit and cursor-based pagination
 * - Returns messages in chronological order
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No DELETE
 * - No routing
 * - No processing
 * - No side effects
 * - No state mutations
 */
export async function listInboundMessagesByConversation(
  conversationId: string,
  limit?: number,
  cursor?: string
): Promise<InboundMessage[]> {
  const queryLimit = limit ?? 100;
  
  if (cursor) {
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
      WHERE conversation_id = ${conversationId}
        AND received_at > ${cursor}
      ORDER BY received_at ASC
      LIMIT ${queryLimit}
    `;
    return result;
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
    WHERE conversation_id = ${conversationId}
    ORDER BY received_at ASC
    LIMIT ${queryLimit}
  `;

  return result;
}

/**
 * Returns sender_identity of the latest inbound message for a conversation (read-only).
 * Used for WhatsApp target resolution fallback when conversation has no customer_identifier.
 *
 * @param conversationId - Conversation UUID
 * @returns sender_identity (e.g. phone "from") or null if no inbound messages
 */
export async function getLatestInboundSenderIdentityByConversationId(
  conversationId: string
): Promise<string | null> {
  const result = await sql<Array<{ sender_identity: string }>>`
    SELECT sender_identity
    FROM inbound_messages
    WHERE conversation_id = ${conversationId}::uuid
    ORDER BY received_at DESC
    LIMIT 1
  `;
  if (result.length === 0) return null;
  const value = result[0].sender_identity;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

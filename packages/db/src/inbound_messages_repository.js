import { sql } from './client.js';
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
export async function insertInboundMessage(params) {
    const result = await sql `
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
export async function findInboundMessageByExternalId(channel, externalMessageId) {
    const result = await sql `
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
    WHERE channel = ${channel}
      AND external_message_id = ${externalMessageId}
    LIMIT 1
  `;
    return result.length > 0 ? result[0] : null;
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
export async function listInboundMessagesByConversation(conversationId, limit, cursor) {
    const queryLimit = limit ?? 100;
    if (cursor) {
        const result = await sql `
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
    const result = await sql `
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
//# sourceMappingURL=inbound_messages_repository.js.map
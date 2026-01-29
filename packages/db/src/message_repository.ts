import { sql } from './client.js';
import { findInboundMessageByExternalId, insertInboundMessage, type InsertInboundMessageParams } from './inbound_messages_repository.js';

/** Transaction callback receives a callable client; postgres types expose it as TransactionSql. Cast for tagged template usage. */
function txAsSql(tx: unknown): typeof sql {
  return tx as unknown as typeof sql;
}

export type MessageDirection = 'inbound' | 'outbound';

export interface Message {
  id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  raw_payload: string;
  created_at: string;
}

export interface CreateMessageParams {
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  raw_payload: string;
}

/**
 * Creates a new message (append-only event log entry).
 */
export async function createMessage(params: CreateMessageParams): Promise<Message> {
  const result = await sql<Message[]>`
    INSERT INTO messages (conversation_id, direction, content, raw_payload, created_at)
    VALUES (${params.conversation_id}, ${params.direction}, ${params.content}, ${params.raw_payload}, NOW())
    RETURNING id, conversation_id, direction, content, raw_payload, created_at
  `;

  if (result.length === 0) {
    throw new Error('Failed to create message: no row returned');
  }

  return result[0];
}

/**
 * Retrieves all messages for a conversation, ordered by creation time (ascending).
 * Returns empty array if no messages exist.
 */
export async function getMessagesByConversation(
  conversationId: string
): Promise<Message[]> {
  const result = await sql<Message[]>`
    SELECT id, conversation_id, direction, content, raw_payload, created_at
    FROM messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;

  return result;
}

/**
 * Checks if an inbound message exists by external_id (idempotency check).
 * 
 * WHAT IT DOES:
 * - Checks inbound_messages table for (channel, external_message_id)
 * - Returns true if message exists, false otherwise
 * 
 * WHAT IT DOES NOT DO:
 * - No INSERT
 * - No UPDATE
 * - No side effects
 * 
 * @param channel - Channel name (e.g., 'whatsapp')
 * @param externalId - External message ID from the channel
 * @returns true if message exists, false otherwise
 */
export async function messageExistsByExternalId(
  channel: string,
  externalId: string
): Promise<boolean> {
  const existing = await findInboundMessageByExternalId(channel, externalId);
  return existing !== null;
}

/**
 * Persists an inbound message (idempotent).
 * 
 * WHAT IT DOES:
 * - Checks if message already exists by external_id
 * - If exists → returns existing message id (no-op)
 * - If not exists → inserts new message
 * - Returns message id
 * 
 * WHAT IT DOES NOT DO:
 * - No duplicate inserts
 * - No side effects beyond persistence
 * 
 * @param params - Message parameters including external_message_id
 * @returns Message id (existing or newly created)
 */
export async function persistInboundMessage(
  params: InsertInboundMessageParams
): Promise<string> {
  // Idempotency check: if message already exists, return existing id
  const existing = await findInboundMessageByExternalId(
    params.channel,
    params.external_message_id
  );
  
  if (existing) {
    return existing.id;
  }

  // Message doesn't exist: insert it
  return insertInboundMessage(params);
}

/**
 * Bridge function: Persists inbound message to both inbound_messages and messages tables.
 * 
 * WHAT IT DOES:
 * - Checks idempotency in inbound_messages (by channel + external_message_id)
 * - If exists → returns existing inbound_message id (no-op, no inserts)
 * - If not exists → atomically inserts into:
 *   1. inbound_messages (source of truth for external channels)
 *   2. messages (for UI/Inbox visibility)
 * - Returns inbound_message id
 * 
 * WHAT IT DOES NOT DO:
 * - No duplicate inserts
 * - No partial writes (both inserts succeed or both fail)
 * - No side effects beyond persistence
 * 
 * @param params - Bridge parameters
 * @returns Inbound message id (existing or newly created)
 */
export interface PersistInboundMessageWithInboxBridgeParams {
  conversationId: string;
  channel: 'whatsapp';
  externalMessageId: string;
  senderIdentity: string;
  messageText: string;
  // PILOT MODE: message_type removed (column not in schema, direction is sufficient)
  receivedAt: Date;
  rawPayload?: any;
}

export async function persistInboundMessageWithInboxBridge(
  params: PersistInboundMessageWithInboxBridgeParams
): Promise<string> {
  console.log('[DEBUG PERSIST] persistInboundMessageWithInboxBridge called');
  console.log('[DEBUG PERSIST] params.conversationId:', params.conversationId, 'type:', typeof params.conversationId);
  console.log('[DEBUG PERSIST] Full params:', JSON.stringify({ ...params, rawPayload: '[omitted]' }, null, 2));
  
  // Idempotency check: if inbound_message already exists, return existing id
  const existing = await findInboundMessageByExternalId(
    params.channel,
    params.externalMessageId
  );
  
  if (existing) {
    // Message already exists: return existing id, do NOT insert anything else
    return existing.id;
  }

  // Message doesn't exist: insert into both tables atomically using a transaction
  const receivedAtISO = params.receivedAt.toISOString();
  
  console.log('[DEBUG PERSIST] About to INSERT - conversationId:', params.conversationId, 'type:', typeof params.conversationId);
  
  // Use transaction to ensure both inserts succeed or both fail (atomicity)
  return await sql.begin(async (tx) => {
    const db = txAsSql(tx);
    // Step 1: Insert into inbound_messages
    console.log('[DEBUG PERSIST] Inside transaction - conversationId:', params.conversationId, 'type:', typeof params.conversationId);
    // PILOT MODE: message_type column not in schema, removed from INSERT
    
    const inboundMessageResult = await db<Array<{ id: string }>>`
      INSERT INTO inbound_messages (
        channel,
        conversation_id,
        external_message_id,
        sender_identity,
        message_text,
        raw_payload,
        received_at
      )
      VALUES (
        ${params.channel},
        ${params.conversationId},
        ${params.externalMessageId},
        ${params.senderIdentity},
        ${params.messageText},
        ${JSON.stringify(params.rawPayload || {})}::jsonb,
        ${receivedAtISO}
      )
      RETURNING id
    `;

    if (inboundMessageResult.length === 0) {
      throw new Error('Failed to insert inbound message: no row returned');
    }

    const inboundMessageId = inboundMessageResult[0].id;

    // Step 2: Insert into messages (for UI/Inbox visibility)
    await db`
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
        ${params.conversationId},
        ${params.channel},
        'inbound',
        ${params.messageText},
        ${params.senderIdentity},
        ${params.externalMessageId},
        ${JSON.stringify(params.rawPayload || {})}::jsonb,
        ${receivedAtISO}
      )
    `;

    return inboundMessageId;
  });
}

/**
 * Persists an outbound message (manual send only).
 * 
 * WHAT IT DOES:
 * - Inserts a new outbound message into messages table
 * - Sets direction = 'outbound'
 * - Sets channel = 'whatsapp'
 * - Sets sender_identity from params
 * - Sets message_text from params
 * - Sets created_at = NOW()
 * - PILOT MODE: AI override disabled (ai_enabled column not in schema)
 * - Returns message id
 * 
 * WHAT IT DOES NOT DO:
 * - No idempotency check (manual send, duplicates allowed)
 * - No WhatsApp delivery
 * - No AI calls
 * - No booking creation
 * - No other side effects beyond persistence and AI disable
 * 
 * BEHAVIOR:
 * - Human override is deterministic: every human outbound message disables AI
 * - Both operations (insert message + disable AI) are atomic (same transaction)
 * - If either operation fails, both are rolled back
 * 
 * @param params - Outbound message parameters
 * @returns Message id
 */
export interface PersistOutboundMessageParams {
  conversationId: string;
  channel: 'whatsapp';
  senderIdentity: string;
  messageText: string;
}

export async function persistOutboundMessage(
  params: PersistOutboundMessageParams
): Promise<{ id: string }> {
  // Use transaction to ensure atomicity: insert message + disable AI if human
  return await sql.begin(async (tx) => {
    const db = txAsSql(tx);
    // Step 1: Insert outbound message
    const result = await db<Array<{ id: string }>>`
      INSERT INTO messages (
        conversation_id,
        channel,
        direction,
        message_text,
        sender_identity,
        created_at
      )
      VALUES (
        ${params.conversationId},
        ${params.channel},
        'outbound',
        ${params.messageText},
        ${params.senderIdentity},
        NOW()
      )
      RETURNING id
    `;

    if (result.length === 0) {
      throw new Error('Failed to insert outbound message: no row returned');
    }

    // PILOT MODE: AI override disabled (ai_enabled column not part of schema)
    // Step 2: If sender is human, disable AI for this conversation (deterministic override)
    // DISABLED: ai_enabled column does not exist in pilot schema
    /*
    if (params.senderIdentity === 'human') {
      await db`
        UPDATE conversations
        SET ai_enabled = false, updated_at = NOW()
        WHERE id = ${params.conversationId}
      `;
    }
    */

    return { id: result[0].id };
  });
}

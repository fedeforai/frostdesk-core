// OUT OF PILOT SCOPE – DO NOT USE IN v1
// PILOT MODE v1: This service is disabled. Use persistInboundMessageWithInboxBridge directly.
// This service requires message_type which is not in the pilot schema.

import {
  insertInboundMessage,
  findInboundMessageByExternalId,
  type InsertInboundMessageParams,
} from '../../db/src/inbound_messages_repository.js';

export interface PersistInboundMessageParams {
  channel: string;
  conversation_id: string;
  external_message_id: string;
  sender_identity: string;
  message_type: string; // OUT OF PILOT SCOPE
  message_text: string | null;
  raw_payload: any;
  received_at: string;
}

export interface PersistInboundMessageResult {
  status: 'inserted' | 'already_exists';
  message_id: string;
}

/**
 * OUT OF PILOT SCOPE – DO NOT USE IN v1
 * 
 * PILOT MODE v1: This function is disabled and will throw if called.
 * The pilot webhook MUST use persistInboundMessageWithInboxBridge directly.
 * 
 * This service requires message_type which is not in the pilot schema.
 * 
 * WHAT IT DOES:
 * - Checks if message already exists via findInboundMessageByExternalId()
 * - If exists → returns { status: "already_exists", message_id: string }
 * - If not exists → INSERTs new message and returns { status: "inserted", message_id: string }
 * - Accepts all required fields as explicit inputs
 * - Performs explicit idempotency check before INSERT
 * - Returns deterministic result based on message existence
 * 
 * WHAT IT DOES NOT DO:
 * - No routing logic
 * - No message processing
 * - No AI calls
 * - No automation
 * - No retries
 * - No conversation creation
 * - No identity resolution
 * - No side effects beyond DB INSERT
 * - No UPDATE or DELETE operations
 */
export async function persistInboundMessage(
  params: PersistInboundMessageParams
): Promise<PersistInboundMessageResult> {
  // PILOT MODE v1: This service is disabled
  throw new Error(
    'persistInboundMessage is OUT OF PILOT SCOPE. ' +
    'Use persistInboundMessageWithInboxBridge from @frostdesk/db/src/message_repository.js instead.'
  );
  const existing = await findInboundMessageByExternalId(
    params.channel,
    params.external_message_id
  );

  if (existing !== null) {
    return {
      status: 'already_exists',
      message_id: existing.id,
    };
  }

  const messageId = await insertInboundMessage(params);

  return {
    status: 'inserted',
    message_id: messageId,
  };
}

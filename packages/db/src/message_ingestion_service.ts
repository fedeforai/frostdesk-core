import { resolveConversationForInboundMessage } from './conversation_service.js';
import { createMessage } from './message_repository.js';

export interface IngestInboundMessageParams {
  instructorId: string;
  customerIdentifier: string;
  content: string;
  rawPayload: unknown;
}

export interface IngestInboundMessageResult {
  conversationId: string;
  messageId: string;
}

/**
 * Ingests an inbound message into the system.
 * 
 * This function:
 * 1. Resolves the correct conversation for the message
 * 2. Persists the message as an event
 * 3. Returns minimal context for next steps
 * 
 * @param params - Inbound message parameters
 * @returns Conversation and message IDs
 */
export async function ingestInboundMessage(
  params: IngestInboundMessageParams
): Promise<IngestInboundMessageResult> {
  // Resolve conversation
  const conversation = await resolveConversationForInboundMessage({
    instructorId: params.instructorId,
    customerIdentifier: params.customerIdentifier,
  });

  // Persist message
  const message = await createMessage({
    conversation_id: conversation.id,
    direction: 'inbound',
    content: params.content,
    raw_payload: JSON.stringify(params.rawPayload),
  });

  // Return minimal context
  return {
    conversationId: conversation.id,
    messageId: message.id,
  };
}

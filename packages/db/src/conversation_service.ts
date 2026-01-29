import { sql } from './client.js';
import { Conversation, createConversation, getOpenConversationByCustomer, ConversationNotFoundError, getConversationById, setConversationAIMode } from './conversation_repository.js';
import { assertAdminAccess } from './admin_access.js';

export interface ResolveConversationForInboundMessageParams {
  instructorId: string;
  customerIdentifier: string;
}

/**
 * Resolves which conversation an inbound message belongs to.
 * 
 * Rules:
 * - If a conversation exists for the customer, use the most recent one
 * - Otherwise, create a new conversation
 * 
 * @param params - Resolution parameters
 * @returns The conversation to use for the inbound message
 */
export async function resolveConversationForInboundMessage(
  params: ResolveConversationForInboundMessageParams
): Promise<Conversation> {
  const { instructorId, customerIdentifier } = params;
  const instructorIdNum = Number(instructorId);

  // Check for existing conversation
  const existingConversation = await getOpenConversationByCustomer(customerIdentifier);

  if (existingConversation) {
    return existingConversation;
  }

  // No conversation exists, create a new one
  return createConversation({
    instructor_id: instructorIdNum,
    customer_identifier: customerIdentifier,
  });
}

/**
 * Sets the AI mode for a conversation (admin-only).
 * 
 * WHAT IT DOES:
 * - Enforces admin access
 * - PILOT MODE: DISABLED - ai_enabled column not part of schema (no-op)
 * 
 * WHAT IT DOES NOT DO:
 * - No AI calls
 * - No outbound messages
 * - No automation
 * - No side effects beyond DB update
 * 
 * @param conversationId - Conversation ID
 * @param enabled - AI enabled state (true = ON, false = OFF)
 * @param userId - Admin user ID
 */
export async function setConversationAIModeAdmin(
  conversationId: string,
  enabled: boolean,
  userId: string
): Promise<void> {
  await assertAdminAccess(userId);
  await setConversationAIMode(conversationId, enabled);
}

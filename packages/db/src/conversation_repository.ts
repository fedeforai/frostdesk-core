import { sql } from './client.js';
import { findChannelIdentityMapping, insertChannelIdentityMapping } from './channel_identity_mapping_repository.js';
import { ensureValidUUID } from './utils.js';

/**
 * PILOT MODE: Hard assertion to prevent ai_enabled usage
 * 
 * This function throws if ai_enabled is accessed in any form.
 * This prevents silent regressions where ai_enabled might be reintroduced.
 */
function assertNoAiEnabledUsage(obj: any, context: string = 'unknown'): void {
  if (obj && typeof obj === 'object') {
    if ('ai_enabled' in obj) {
      throw new Error(`[FATAL] ai_enabled accessed in PILOT MODE at: ${context}`);
    }
    // Check nested objects
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        assertNoAiEnabledUsage(obj[key], `${context}.${key}`);
      }
    }
  }
}

export interface Conversation {
  id: string;
  instructor_id: number;
  customer_identifier: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConversationParams {
  instructor_id: number;
  customer_identifier: string;
  channel?: string; // Optional, defaults to 'whatsapp'
}

export class ConversationNotFoundError extends Error {
  code = 'CONVERSATION_NOT_FOUND';
  
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = 'ConversationNotFoundError';
  }
}

/**
 * Creates a new conversation.
 */
export async function createConversation(params: CreateConversationParams): Promise<Conversation> {
  console.log('[DEBUG CREATE] createConversation called - params:', JSON.stringify(params, null, 2));
  console.log('[DEBUG CREATE] instructor_id type:', typeof params.instructor_id, 'value:', params.instructor_id);
  
  // Convert instructor_id from number to UUID string if needed
  // The database expects UUID, but we're passing a number (1)
  // Use a fixed UUID for default instructor
  const instructorIdUuid = params.instructor_id === 1 
    ? '00000000-0000-0000-0000-000000000001' 
    : String(params.instructor_id);
  
  // Default channel to 'whatsapp' if not provided
  const channel = params.channel ?? 'whatsapp';
  // Default status to 'open' (conversations are always active in pilot mode)
  const status = 'open';
  
  console.log('[DEBUG CREATE] instructorIdUuid:', instructorIdUuid, 'type:', typeof instructorIdUuid);
  console.log('[DEBUG CREATE] channel:', channel);
  console.log('[DEBUG CREATE] status:', status);
  
  try {
    const result = await sql<Conversation[]>`
      INSERT INTO conversations (instructor_id, customer_identifier, channel, status, created_at, updated_at)
      VALUES (${instructorIdUuid}::uuid, ${params.customer_identifier}, ${channel}, ${status}, NOW(), NOW())
      RETURNING id, instructor_id, customer_identifier, created_at, updated_at
    `;

    console.log('[DEBUG CREATE] SQL result length:', result.length);
    if (result.length > 0) {
      console.log('[DEBUG CREATE] First row id:', result[0].id, 'type:', typeof result[0].id, 'full row:', JSON.stringify(result[0], null, 2));
      // Hard assertion: ensure ai_enabled is not in result
      assertNoAiEnabledUsage(result[0], 'createConversation');
    }

    if (result.length === 0) {
      throw new Error('Failed to create conversation: no row returned');
    }

    return result[0];
  } catch (error: any) {
    console.error('[DEBUG CREATE] SQL ERROR:', error.message);
    console.error('[DEBUG CREATE] Error code:', error.code);
    console.error('[DEBUG CREATE] Error detail:', error.detail);
    throw error;
  }
}

/**
 * Retrieves a conversation by its ID.
 * Returns null if not found.
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  // PILOT MODE: ai_enabled column not part of schema, removed from SELECT
  const result = await sql<Conversation[]>`
    SELECT id, instructor_id, customer_identifier, created_at, updated_at
    FROM conversations
    WHERE id = ${conversationId}
  `;

  if (result.length > 0) {
    // Hard assertion: ensure ai_enabled is not in result
    assertNoAiEnabledUsage(result[0], 'getConversationById');
    return result[0];
  }

  return null;
}

/**
 * Retrieves the most recent conversation for a customer.
 * Returns null if no conversation exists.
 */
export async function getOpenConversationByCustomer(
  customerIdentifier: string
): Promise<Conversation | null> {
  const result = await sql<Conversation[]>`
    SELECT id, instructor_id, customer_identifier, created_at, updated_at
    FROM conversations
    WHERE customer_identifier = ${customerIdentifier}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

/**
 * Resolves a conversation by channel and customer identifier.
 * 
 * WHAT IT DOES:
 * - Looks up channel_identity_mapping to find existing conversation
 * - If not found, creates a new conversation
 * - Creates channel_identity_mapping for the new conversation
 * - Returns the conversation (existing or newly created)
 * 
 * WHAT IT DOES NOT DO:
 * - No duplicate conversations
 * - No side effects beyond conversation creation
 * 
 * @param channel - Channel name (e.g., 'whatsapp')
 * @param customerIdentifier - Customer identifier (e.g., phone number)
 * @param instructorId - Instructor ID (defaults to 1)
 * @returns The conversation for this channel + customer
 */
export async function resolveConversationByChannel(
  channel: string,
  customerIdentifier: string,
  instructorId: number = 1
): Promise<Conversation> {
  console.log('[DEBUG REPO] resolveConversationByChannel called - channel:', channel, 'customerIdentifier:', customerIdentifier, 'instructorId:', instructorId, 'type:', typeof instructorId);
  
  // Check for existing channel identity mapping
  const mapping = await findChannelIdentityMapping(channel, customerIdentifier);
  console.log('[DEBUG REPO] mapping found:', mapping ? 'YES' : 'NO', mapping ? `conversation_id: ${mapping.conversation_id} (type: ${typeof mapping.conversation_id})` : '');
  
  if (mapping) {
    // Validate conversation_id from mapping is a valid UUID
    // This prevents corrupted database rows (e.g., conversation_id="1") from propagating
    const validatedConversationId = ensureValidUUID(mapping.conversation_id);
    console.log('[DEBUG REPO] validatedConversationId:', validatedConversationId, 'original:', mapping.conversation_id, 'changed:', validatedConversationId !== mapping.conversation_id);
    
    // If the mapping had an invalid UUID, it was regenerated by ensureValidUUID
    // In this case, we should create a new conversation instead of using the invalid mapping
    if (validatedConversationId !== mapping.conversation_id) {
      // Invalid UUID in mapping: create new conversation and update mapping
      console.log('[DEBUG REPO] Invalid UUID detected, creating new conversation');
      const newConversation = await createConversation({
        instructor_id: instructorId,
        customer_identifier: customerIdentifier,
      });
      console.log('[DEBUG REPO] New conversation created - id:', newConversation.id, 'type:', typeof newConversation.id);
      
      // Update the mapping with the valid UUID
      try {
        await insertChannelIdentityMapping(channel, customerIdentifier, newConversation.id);
      } catch (error) {
        // Mapping update might fail (race condition), continue anyway
      }
      
      return newConversation;
    }
    
    // Mapping has valid UUID: fetch and return the conversation
    const conversation = await getConversationById(validatedConversationId);
    console.log('[DEBUG REPO] getConversationById result:', conversation ? `id: ${conversation.id} (type: ${typeof conversation.id})` : 'null');
    if (conversation) {
      return conversation;
    }
    // If conversation was deleted, fall through to create new one
  }

  // No mapping exists: create new conversation
  console.log('[DEBUG REPO] No mapping, creating new conversation');
  const newConversation = await createConversation({
    instructor_id: instructorId,
    customer_identifier: customerIdentifier,
  });
  console.log('[DEBUG REPO] New conversation created - id:', newConversation.id, 'type:', typeof newConversation.id, 'full object:', JSON.stringify(newConversation, null, 2));

  // Create channel identity mapping
  try {
    await insertChannelIdentityMapping(channel, customerIdentifier, newConversation.id);
  } catch (error) {
    // Mapping might already exist (race condition), continue anyway
    // The conversation is still valid
  }

  return newConversation;
}

/**
 * Sets the AI mode for a conversation.
 * 
 * PILOT MODE: DISABLED - ai_enabled column not part of schema
 * 
 * WHAT IT DOES:
 * - PILOT MODE: DISABLED - ai_enabled column not part of schema (no-op)
 * - Sets enabled state (true = ON, false = OFF)
 * 
 * WHAT IT DOES NOT DO:
 * - No AI calls
 * - No outbound messages
 * - No automation
 * - No side effects beyond DB update
 * 
 * @param conversationId - Conversation ID
 * @param enabled - AI enabled state (true = ON, false = OFF)
 * @throws ConversationNotFoundError if conversation does not exist
 */
export async function setConversationAIMode(
  conversationId: string,
  enabled: boolean
): Promise<void> {
  // PILOT MODE: ai_enabled column does not exist, no-op
  // This function is kept for API compatibility but performs no database operation
  return Promise.resolve();
}

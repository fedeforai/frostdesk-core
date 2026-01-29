/**
 * WhatsApp target phone resolution (conversation → E.164).
 * Read-only. Used only by human-triggered outbound routes.
 */

import {
  getConversationById,
  getLatestInboundSenderIdentityByConversationId,
} from '@frostdesk/db';

export const TARGET_NOT_FOUND = 'TARGET_NOT_FOUND';

/**
 * Normalizes a stored phone/identifier to digits-only (E.164-style).
 * WhatsApp Cloud API expects "to" as digits only, no leading +.
 * Throws TARGET_NOT_FOUND if result has fewer than 10 digits.
 */
function toE164Digits(value: string, conversationId: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10) {
    const err = new Error(`${TARGET_NOT_FOUND}: phone has fewer than 10 digits`);
    (err as any).code = TARGET_NOT_FOUND;
    (err as any).conversationId = conversationId;
    throw err;
  }
  return digits;
}

/**
 * Resolves the WhatsApp destination phone for a conversation.
 *
 * Decision rule:
 * 1. Primary: conversation.customer_identifier (canonical stored identity).
 * 2. Fallback: latest inbound message sender_identity from inbound_messages.
 * 3. If none: throws Error with code TARGET_NOT_FOUND and context conversationId.
 *
 * @param conversationId - Conversation UUID
 * @returns E.164-style string (digits only)
 * @throws Error with message containing TARGET_NOT_FOUND and conversationId when no target found
 */
export async function resolveWhatsAppTargetPhone(
  conversationId: string
): Promise<string> {
  const conv = await getConversationById(conversationId);
  if (!conv) {
    const err = new Error(`${TARGET_NOT_FOUND}: conversation not found`);
    (err as any).code = TARGET_NOT_FOUND;
    (err as any).conversationId = conversationId;
    throw err;
  }

  const primary = (conv.customer_identifier || '').trim();
  if (primary) {
    return toE164Digits(primary, conversationId);
  }

  const fallback = await getLatestInboundSenderIdentityByConversationId(conversationId);
  if (!fallback || !fallback.trim()) {
    const err = new Error(`${TARGET_NOT_FOUND}: no customer_identifier and no inbound sender for conversation`);
    (err as any).code = TARGET_NOT_FOUND;
    (err as any).conversationId = conversationId;
    throw err;
  }

  return toE164Digits(fallback, conversationId);
}

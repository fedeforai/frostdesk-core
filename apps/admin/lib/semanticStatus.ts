/**
 * Semantic Status Mapper
 *
 * Pure functions only.
 * No DB access.
 * No side effects.
 * Uses existing fields only.
 */

/* ------------------------------------------------------------------ */
/* Types (loose on purpose, to avoid coupling)                          */
/* ------------------------------------------------------------------ */

type Conversation = {
  id: string;
  status?: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  direction?: 'inbound' | 'outbound' | null;
  sender_identity?: 'customer' | 'human' | 'ai' | null;
  created_at?: string;
};

type Draft = {
  id: string;
  conversation_id: string;
  created_at?: string;
};

type Booking = {
  id: string;
  status?: string | null;
};

/* ------------------------------------------------------------------ */
/* Conversation Semantic Status                                        */
/* ------------------------------------------------------------------ */

/**
 * Derives semantic status for a conversation.
 *
 * Possible outputs:
 * - new
 * - waiting_human
 * - ai_draft_ready
 * - closed
 * 
 * @param conversation - Conversation object
 * @param messages - Array of messages for the conversation
 * @param hasAIDraft - Optional: true if an AI draft exists in message_metadata (not yet sent)
 */
export function getConversationSemanticStatus(
  conversation: Conversation,
  messages: Message[],
  hasAIDraft?: boolean
): 'new' | 'waiting_human' | 'ai_draft_ready' | 'closed' {
  // Explicitly closed conversation
  if (conversation.status === 'closed') {
    return 'closed';
  }

  const convoMessages = messages.filter(
    (m) => m.conversation_id === conversation.id
  );

  const hasInbound = convoMessages.some(
    (m) => m.direction === 'inbound'
  );

  const hasOutboundHumanOrAI = convoMessages.some(
    (m) =>
      m.direction === 'outbound' &&
      (m.sender_identity === 'human' || m.sender_identity === 'ai')
  );

  if (hasInbound && !hasOutboundHumanOrAI) {
    return 'new';
  }

  // ai_draft_ready: draft exists in message_metadata and no human response sent
  if (hasAIDraft === true && !hasOutboundHumanOrAI) {
    return 'ai_draft_ready';
  }
  
  return 'waiting_human';
}

/* ------------------------------------------------------------------ */
/* AI Draft Semantic Status                                             */
/* ------------------------------------------------------------------ */

/**
 * Derives semantic status for an AI draft.
 *
 * Possible outputs:
 * - pending
 * - approved
 * - sent
 */
export function getDraftSemanticStatus(
  draft: Draft | null,
  messages: Message[]
): 'pending' | 'approved' | 'sent' {
  if (!draft) {
    return 'sent';
  }

  const convoMessages = messages.filter(
    (m) => m.conversation_id === draft.conversation_id
  );

  const hasHumanOutbound = convoMessages.some(
    (m) =>
      m.direction === 'outbound' &&
      m.sender_identity === 'human'
  );

  if (hasHumanOutbound) {
    return 'sent';
  }

  return 'pending';
}

/* ------------------------------------------------------------------ */
/* Booking Semantic Status                                              */
/* ------------------------------------------------------------------ */

/**
 * Maps booking.status to semantic booking status.
 *
 * Possible outputs:
 * - proposed (maps from 'pending', 'proposed', 'draft')
 * - confirmed (maps from 'confirmed', 'completed')
 * - cancelled (maps from 'cancelled', 'declined')
 * - modified
 * - expired
 */
export function getBookingSemanticStatus(
  booking: Booking
): 'proposed' | 'confirmed' | 'cancelled' | 'modified' | 'expired' {
  switch (booking.status) {
    case 'confirmed':
    case 'completed':
      return 'confirmed';
    case 'cancelled':
    case 'declined':
      return 'cancelled';
    case 'modified':
      return 'modified';
    case 'expired':
      return 'expired';
    case 'pending':
    case 'proposed':
    case 'draft':
    default:
      return 'proposed';
  }
}

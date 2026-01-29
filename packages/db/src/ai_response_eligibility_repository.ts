import { sql } from './client.js';
import { isAIEnabledForConversation } from './ai_global_gate.js';

export async function evaluateAIResponseEligibility(params: {
  conversationId: string;
}): Promise<{
  eligible_for_ai: boolean;
  reason:
    | 'ok'
    | 'low_confidence'
    | 'requires_human'
    | 'booking_risk'
    | 'policy_block'
    | 'ai_disabled';
}> {
  const { conversationId } = params;

  // AI GLOBAL GATE: Check kill switch
  const conversationResult = await sql<Array<{
    channel: string;
  }>>`
    SELECT channel
    FROM conversations
    WHERE id = ${conversationId}
    LIMIT 1
  `;

  if (conversationResult.length > 0) {
    const channel = conversationResult[0].channel;
    const aiEnabled = await isAIEnabledForConversation({ channel });
    if (!aiEnabled) {
      return {
        eligible_for_ai: false,
        reason: 'ai_disabled',
      };
    }
  }

  // LOW CONFIDENCE: Get latest inbound message and check intent confidence
  const latestMessageResult = await sql<Array<{
    message_id: string;
    confidence: number | null;
    escalation_required: boolean | null;
  }>>`
    SELECT 
      m.id AS message_id,
      (mm.value->>'confidence')::numeric AS confidence,
      (mm.value->>'escalation_required')::boolean AS escalation_required
    FROM messages m
    LEFT JOIN message_metadata mm ON mm.message_id = m.id AND mm.key = 'intent_classification'
    WHERE m.conversation_id = ${conversationId}
      AND m.direction = 'inbound'
    ORDER BY m.created_at DESC
    LIMIT 1
  `;

  if (latestMessageResult.length > 0) {
    const confidence = latestMessageResult[0].confidence;
    if (confidence !== null && confidence < 0.6) {
      return {
        eligible_for_ai: false,
        reason: 'low_confidence',
      };
    }

    // REQUIRES HUMAN: Check escalation_required in metadata
    const escalationRequired = latestMessageResult[0].escalation_required;
    if (escalationRequired === true) {
      return {
        eligible_for_ai: false,
        reason: 'requires_human',
      };
    }
  }

  // BOOKING RISK: Check if booking exists and status is not 'draft'
  const bookingResult = await sql<Array<{
    status: string;
  }>>`
    SELECT status
    FROM bookings
    WHERE conversation_id = ${conversationId}
    LIMIT 1
  `;

  if (bookingResult.length > 0 && bookingResult[0].status !== 'draft') {
    return {
      eligible_for_ai: false,
      reason: 'booking_risk',
    };
  }

  // POLICY BLOCK: Check if channel is allowed
  if (conversationResult.length === 0) {
    return {
      eligible_for_ai: false,
      reason: 'policy_block',
    };
  }

  const channel = conversationResult[0].channel;
  if (channel !== 'whatsapp') {
    return {
      eligible_for_ai: false,
      reason: 'policy_block',
    };
  }

  // OK: All checks passed
  return {
    eligible_for_ai: true,
    reason: 'ok',
  };
}

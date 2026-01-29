import { sql } from './client.js';

export async function classifyEscalationNeed(params: {
  conversationId: string;
}): Promise<{
  escalation_required: boolean;
  reason:
    | 'explicit_request'
    | 'low_confidence'
    | 'negative_sentiment'
    | 'booking_risk'
    | 'none';
}> {
  const { conversationId } = params;

  // Get latest inbound message and its metadata
  const messageResult = await sql<Array<{
    intent: string | null;
    escalation_required: boolean | null;
    confidence: number | null;
    sentiment: string | null;
    sentiment_score: number | null;
  }>>`
    SELECT 
      (mm.value->>'intent')::text AS intent,
      (mm.value->>'escalation_required')::boolean AS escalation_required,
      (mm.value->>'confidence')::numeric AS confidence,
      (mm.value->>'sentiment')::text AS sentiment,
      (mm.value->>'sentiment_score')::numeric AS sentiment_score
    FROM messages m
    LEFT JOIN message_metadata mm ON mm.message_id = m.id AND mm.key = 'intent_classification'
    WHERE m.conversation_id = ${conversationId}
      AND m.direction = 'inbound'
    ORDER BY m.created_at DESC
    LIMIT 1
  `;

  if (messageResult.length > 0) {
    const metadata = messageResult[0];

    // EXPLICIT REQUEST
    if (metadata.intent === 'human_request' || metadata.escalation_required === true) {
      return {
        escalation_required: true,
        reason: 'explicit_request',
      };
    }

    // LOW CONFIDENCE
    if (metadata.confidence !== null && metadata.confidence < 0.6) {
      return {
        escalation_required: true,
        reason: 'low_confidence',
      };
    }

    // NEGATIVE SENTIMENT
    if (metadata.sentiment === 'negative' || (metadata.sentiment_score !== null && metadata.sentiment_score <= -0.5)) {
      return {
        escalation_required: true,
        reason: 'negative_sentiment',
      };
    }
  }

  // BOOKING RISK
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
      escalation_required: true,
      reason: 'booking_risk',
    };
  }

  // NONE
  return {
    escalation_required: false,
    reason: 'none',
  };
}

/**
 * PILOT STUB — classifyEscalation
 * 
 * Temporary stub to match import in ai_gating_service.ts
 * Maps classifyEscalationNeed result to expected format.
 * 
 * @param params - Conversation ID
 * @returns Escalation decision with requires_human and escalation_type
 */
export async function classifyEscalation(params: {
  conversationId: string;
}): Promise<{
  requires_human: boolean;
  escalation_type: string | null;
}> {
  // Call the existing classifyEscalationNeed function
  const result = await classifyEscalationNeed(params);
  
  // Map escalation_required to requires_human
  const requires_human = result.escalation_required;
  
  // Map reason to escalation_type (or null if none)
  const escalation_type = result.reason !== 'none' ? result.reason : null;
  
  return {
    requires_human,
    escalation_type,
  };
}

import { evaluateAIResponseEligibility } from './ai_response_eligibility_repository.js';
import { classifyEscalationNeed } from './escalation_classifier_repository.js';
import { isAIEnabledForConversation } from './ai_global_gate.js';
import { sql } from './client.js';

export async function buildAIDecisionSnapshot(params: {
  conversationId: string;
}): Promise<{
  eligible: boolean;
  blockers: Array<
    | 'low_confidence'
    | 'explicit_request'
    | 'negative_sentiment'
    | 'booking_risk'
    | 'policy_block'
    | 'ai_disabled'
  >;
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
        eligible: false,
        blockers: ['ai_disabled'],
      };
    }
  }

  const eligibility = await evaluateAIResponseEligibility({
    conversationId,
  });

  const escalation = await classifyEscalationNeed({
    conversationId,
  });

  const eligible = eligibility.eligible_for_ai === true;
  const blockers: Array<
    | 'low_confidence'
    | 'explicit_request'
    | 'negative_sentiment'
    | 'booking_risk'
    | 'policy_block'
    | 'ai_disabled'
  > = [];

  if (eligible === false) {
    if (escalation.reason !== 'none') {
      if (escalation.reason === 'explicit_request') {
        blockers.push('explicit_request');
      }
      if (escalation.reason === 'low_confidence') {
        blockers.push('low_confidence');
      }
      if (escalation.reason === 'negative_sentiment') {
        blockers.push('negative_sentiment');
      }
      if (escalation.reason === 'booking_risk') {
        blockers.push('booking_risk');
      }
    }

    if (eligibility.reason !== 'ok') {
      if (eligibility.reason === 'low_confidence') {
        blockers.push('low_confidence');
      }
      if (eligibility.reason === 'booking_risk') {
        blockers.push('booking_risk');
      }
      if (eligibility.reason === 'policy_block') {
        blockers.push('policy_block');
      }
      if (eligibility.reason === 'ai_disabled') {
        blockers.push('ai_disabled');
      }
    }
  }

  return {
    eligible,
    blockers,
  };
}

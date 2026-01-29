import { assertAdminAccess } from './admin_access.js';
import { evaluateAIResponseEligibility } from './ai_response_eligibility_repository.js';
import { classifyEscalation } from './escalation_classifier_repository.js';

export async function getAIGatingDecision(params: {
  conversationId: string;
  userId: string;
}): Promise<{
  eligible_for_ai: boolean;
  reason: string;
  requires_human: boolean;
  escalation_type: string | null;
}> {
  await assertAdminAccess(params.userId);

  const eligibility = await evaluateAIResponseEligibility({
    conversationId: params.conversationId,
  });

  const escalation = await classifyEscalation({
    conversationId: params.conversationId,
  });

  return {
    eligible_for_ai: eligibility.eligible_for_ai,
    reason: eligibility.reason,
    requires_human: escalation.requires_human,
    escalation_type: escalation.escalation_type,
  };
}

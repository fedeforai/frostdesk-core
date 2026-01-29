import { confidenceGate } from '../../ai/src/confidence_gate.js';
import { handleEscalation } from '../../ai/src/escalation_handler.js';
import { classifyIntent, type IntentClassificationResult } from '../../ai/src/intent_classifier.js';

export interface ProcessMessageParams {
  conversationId: string;
  message: string;
  conversationContext: string[];
}

export interface ProcessMessageResult {
  status: 'escalated' | 'processed';
}

export async function processMessage(
  params: ProcessMessageParams
): Promise<ProcessMessageResult> {
  const { conversationId, message, conversationContext } = params;

  // Classify intent
  const classification: IntentClassificationResult = await classifyIntent({
    message,
    conversationContext,
  });

  // Check confidence gate
  const decision = confidenceGate({
    confidence: classification.confidence,
  });

  // Short-circuit on escalation
  if (decision === 'ESCALATE') {
    const escalation = handleEscalation();
    
    if (escalation.escalated) {
      // State management removed - conversations are always active in pilot mode
      // Escalation logic handled via other mechanisms (handoff_to_human flag, etc.)

      return {
        status: 'escalated',
      };
    }
  }

  // Continue with normal processing (to be implemented)
  return {
    status: 'processed',
  };
}

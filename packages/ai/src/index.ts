export { generateAIReply, type GenerateAIReplyInput, type GenerateAIReplyOutput } from './ai_reply_stub.js';
export { generateAIReplyOpenAI } from './openai_reply.js';
export { sanitizeDraftText } from './draftQualityGuardrails.js';
export type { DraftQualityInput, DraftQualityOutput, DraftViolation, IntentType as DraftIntentType } from './draftQualityGuardrails.js';
export { classifyRelevance, type RelevanceResult, type RelevanceReason } from './relevanceClassifier.js';
export { classifyIntent, type IntentResult, type IntentType } from './intentClassifier.js';
export { classifyRelevanceAndIntent, type RelevanceAndIntentSnapshot } from './relevanceAndIntentClassifier.js';
export { RELEVANCE_MIN, INTENT_MIN_DRAFT, INTENT_MIN_NO_ESCALATION, DecisionType, ReasonCode } from './confidencePolicy.js';
export { decideByConfidence, type ConfidenceDecisionInput, type ConfidenceDecisionOutput } from './confidenceDecisionEngine.js';
export { decideBooking, type DecideBookingInput, type DecideBookingOutput, type DecideBookingAction } from './bookingDecision.js';
export { escalationGate, type EscalationGateInput, type EscalationGateOutput } from './escalationGate.js';
export { resolveDraftEligibility, type DraftEligibilityInput, type DraftEligibilityOutput } from './draftEligibilityResolver.js';

// Loop A: AI Router + Confidence Band + Timeout
export { runAiTask, getTaskTier, type AiTaskType, type AiModelTier, type AiTaskParams, type AiTaskResult, type AiUsageEvent, type AiErrorCode, type SummaryGenerationOutput } from './ai_router.js';
export { mapConfidenceToBand, bandAllowsDraft, bandRequiresEscalation, type ConfidenceBand } from './confidence_band.js';
export { withTimeout, AI_TIMEOUT, type TimeoutResult } from './ai_timeout.js';

// Loop C: Customer context prompt builder
export { buildCustomerContextPrompt, type CustomerContextInput } from './customer_context_prompt.js';
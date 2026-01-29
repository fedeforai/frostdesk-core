/**
 * Confidence Decision Engine (PILOT-SAFE)
 * 
 * Pure function that transforms confidence scores into AI decisions.
 * 
 * WHAT THIS FILE DOES:
 * - Applies confidence thresholds to make decisions
 * - Returns decision type and reason code
 * - Deterministic and testable
 * 
 * WHAT THIS FILE DOES NOT DO:
 * - No database access
 * - No logging
 * - No side effects
 * - No state mutation
 * - Pure function only
 */

import {
  RELEVANCE_MIN,
  INTENT_MIN_DRAFT,
  INTENT_MIN_NO_ESCALATION,
  DecisionType,
  ReasonCode,
} from './confidencePolicy.js';

export interface ConfidenceDecisionInput {
  relevanceConfidence: number;
  intentConfidence: number;
}

export interface ConfidenceDecisionOutput {
  decision: DecisionType;
  reason: ReasonCode;
}

/**
 * Decides AI action based on confidence scores.
 * 
 * Decision Matrix:
 * - relevance < RELEVANCE_MIN → IGNORE / LOW_RELEVANCE
 * - relevance ≥ RELEVANCE_MIN & intent < INTENT_MIN_DRAFT → ESCALATE_ONLY / LOW_INTENT
 * - relevance ≥ RELEVANCE_MIN & intent ≥ INTENT_MIN_DRAFT & intent < INTENT_MIN_NO_ESCALATION → DRAFT_AND_ESCALATE / MEDIUM_CONFIDENCE
 * - relevance ≥ RELEVANCE_MIN & intent ≥ INTENT_MIN_NO_ESCALATION → DRAFT_ONLY / HIGH_CONFIDENCE
 * 
 * @param input - Confidence scores for relevance and intent
 * @returns Decision type and reason code
 */
export function decideByConfidence(
  input: ConfidenceDecisionInput
): ConfidenceDecisionOutput {
  const { relevanceConfidence, intentConfidence } = input;

  // Decision 1: Relevance check (first gate)
  if (relevanceConfidence < RELEVANCE_MIN) {
    return {
      decision: DecisionType.IGNORE,
      reason: ReasonCode.LOW_RELEVANCE,
    };
  }

  // Decision 2: Intent confidence below draft threshold
  if (intentConfidence < INTENT_MIN_DRAFT) {
    return {
      decision: DecisionType.ESCALATE_ONLY,
      reason: ReasonCode.LOW_INTENT,
    };
  }

  // Decision 3: Intent confidence between draft and no-escalation thresholds
  if (intentConfidence < INTENT_MIN_NO_ESCALATION) {
    return {
      decision: DecisionType.DRAFT_AND_ESCALATE,
      reason: ReasonCode.MEDIUM_CONFIDENCE,
    };
  }

  // Decision 4: Intent confidence above no-escalation threshold
  return {
    decision: DecisionType.DRAFT_ONLY,
    reason: ReasonCode.HIGH_CONFIDENCE,
  };
}

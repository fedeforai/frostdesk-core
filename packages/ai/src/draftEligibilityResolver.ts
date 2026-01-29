/**
 * Draft Eligibility Resolver (PILOT-SAFE)
 * 
 * Determines UI visibility and explanation messages based on AI snapshot.
 * 
 * WHAT THIS FILE DOES:
 * - Maps AI decision to UI visibility flags
 * - Provides deterministic explanation keys for UI copy
 * - Enables UI to show/hide draft section and escalation banners
 * 
 * WHAT THIS FILE DOES NOT DO:
 * - No backend changes
 * - No database access
 * - No logging
 * - No side effects
 * - No AI model calls
 * - Does not create drafts
 * - Does not send messages
 * - Does not mutate state
 */

import { DecisionType, ReasonCode } from './confidencePolicy.js';

export interface DraftEligibilityInput {
  relevant: boolean;
  decision: DecisionType | null;
  reason: ReasonCode | null;
  allow_draft?: boolean | null;
  require_escalation?: boolean | null;
}

export interface DraftEligibilityOutput {
  showDraftSection: boolean;
  showEscalationBanner: boolean;
  explanationKey: string;
  decision: DecisionType | null;
  reason: ReasonCode | null;
}

/**
 * Resolves draft eligibility and UI visibility based on AI snapshot.
 * 
 * Deterministic mapping:
 * - decision = null or reason = null → no draft, no escalation, key = "AI_DECISION_MISSING"
 * - decision = IGNORE → no draft, no escalation, key = "AI_IGNORED_LOW_RELEVANCE"
 * - decision = ESCALATE_ONLY → no draft, escalation yes, key = "AI_ESCALATED_LOW_INTENT"
 * - decision = DRAFT_AND_ESCALATE → show draft + escalation, key = "AI_DRAFT_AVAILABLE_NEEDS_REVIEW"
 * - decision = DRAFT_ONLY → show draft, no escalation, key = "AI_DRAFT_AVAILABLE"
 * 
 * @param input - AI snapshot with decision and reason
 * @returns UI visibility flags and explanation key
 */
export function resolveDraftEligibility(
  input: DraftEligibilityInput
): DraftEligibilityOutput {
  const { decision, reason } = input;

  // Missing decision or reason → no draft, no escalation
  if (!decision || !reason) {
    return {
      showDraftSection: false,
      showEscalationBanner: false,
      explanationKey: 'AI_DECISION_MISSING',
      decision: null,
      reason: null,
    };
  }

  // Map decision to UI visibility
  switch (decision) {
    case DecisionType.IGNORE:
      return {
        showDraftSection: false,
        showEscalationBanner: false,
        explanationKey: 'AI_IGNORED_LOW_RELEVANCE',
        decision,
        reason,
      };

    case DecisionType.ESCALATE_ONLY:
      return {
        showDraftSection: false,
        showEscalationBanner: true,
        explanationKey: 'AI_ESCALATED_LOW_INTENT',
        decision,
        reason,
      };

    case DecisionType.DRAFT_AND_ESCALATE:
      return {
        showDraftSection: true,
        showEscalationBanner: true,
        explanationKey: 'AI_DRAFT_AVAILABLE_NEEDS_REVIEW',
        decision,
        reason,
      };

    case DecisionType.DRAFT_ONLY:
      return {
        showDraftSection: true,
        showEscalationBanner: false,
        explanationKey: 'AI_DRAFT_AVAILABLE',
        decision,
        reason,
      };

    default:
      // Fallback: treat unknown decision as missing
      return {
        showDraftSection: false,
        showEscalationBanner: false,
        explanationKey: 'AI_DECISION_MISSING',
        decision: null,
        reason: null,
      };
  }
}

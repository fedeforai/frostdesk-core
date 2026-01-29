/**
 * Escalation Gate (PILOT-SAFE)
 * 
 * Translates confidence decisions into operational permissions.
 * 
 * WHAT THIS FILE DOES:
 * - Maps DecisionType to operational permissions
 * - Returns allowDraft and requireEscalation flags
 * - Provides permission layer without actions
 * 
 * WHAT THIS FILE DOES NOT DO:
 * - No side effects
 * - No sending messages
 * - No booking creation
 * - No database access
 * - No actual escalation or draft generation
 */

import { DecisionType, ReasonCode } from './confidencePolicy.js';

export interface EscalationGateInput {
  decision: DecisionType;
  reason: ReasonCode;
}

export interface EscalationGateOutput {
  allowDraft: boolean;
  requireEscalation: boolean;
  decision: DecisionType;
  reason: ReasonCode;
}

/**
 * Translates confidence decision into operational permissions.
 * 
 * Permission Mapping:
 * - IGNORE → allowDraft=false, requireEscalation=false
 * - ESCALATE_ONLY → allowDraft=false, requireEscalation=true
 * - DRAFT_AND_ESCALATE → allowDraft=true, requireEscalation=true
 * - DRAFT_ONLY → allowDraft=true, requireEscalation=false
 * 
 * @param input - Decision type and reason code
 * @returns Operational permissions with decision context
 */
export function escalationGate(
  input: EscalationGateInput
): EscalationGateOutput {
  const { decision, reason } = input;

  switch (decision) {
    case DecisionType.IGNORE:
      return {
        allowDraft: false,
        requireEscalation: false,
        decision,
        reason,
      };

    case DecisionType.ESCALATE_ONLY:
      return {
        allowDraft: false,
        requireEscalation: true,
        decision,
        reason,
      };

    case DecisionType.DRAFT_AND_ESCALATE:
      return {
        allowDraft: true,
        requireEscalation: true,
        decision,
        reason,
      };

    case DecisionType.DRAFT_ONLY:
      return {
        allowDraft: true,
        requireEscalation: false,
        decision,
        reason,
      };

    default:
      // Fallback: treat unknown decision as IGNORE
      return {
        allowDraft: false,
        requireEscalation: false,
        decision: DecisionType.IGNORE,
        reason: ReasonCode.LOW_RELEVANCE,
      };
  }
}

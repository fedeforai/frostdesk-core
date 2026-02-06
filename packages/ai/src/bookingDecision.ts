/**
 * Booking Decision (PILOT-SAFE) — frozen gate used by inbound_draft_orchestrator.
 * Maps confidence + intent to a single action: ignore, escalate, or ai_reply.
 */

import { decideByConfidence } from './confidenceDecisionEngine.js';
import { DecisionType } from './confidencePolicy.js';

export interface DecideBookingInput {
  relevance: boolean;
  relevanceConfidence: number;
  intent: 'booking' | 'info';
  intentConfidence: number;
}

export type DecideBookingAction = 'ignore' | 'escalate' | 'ai_reply';

export interface DecideBookingOutput {
  action: DecideBookingAction;
}

/**
 * BookingDecision v1 gate (frozen).
 * Returns action for orchestrator: ignore (early return), escalate (early return), or ai_reply (proceed to draft path).
 */
export function decideBooking(input: DecideBookingInput): DecideBookingOutput {
  const decision = decideByConfidence({
    relevanceConfidence: input.relevanceConfidence,
    intentConfidence: input.intentConfidence,
  });

  if (decision.decision === DecisionType.IGNORE) {
    return { action: 'ignore' };
  }
  if (decision.decision === DecisionType.ESCALATE_ONLY) {
    return { action: 'escalate' };
  }
  return { action: 'ai_reply' };
}

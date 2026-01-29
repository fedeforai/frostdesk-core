/**
 * Confidence Policy (PILOT-SAFE)
 * 
 * Defines deterministic confidence thresholds and decision enums
 * for AI classification and response eligibility.
 * 
 * WHAT THIS FILE DOES:
 * - Exports threshold constants
 * - Exports decision type enums
 * - Exports reason code enums
 * - Provides policy definitions only
 * 
 * WHAT THIS FILE DOES NOT DO:
 * - No logic execution
 * - No database access
 * - No side effects
 * - No decision making
 */

/**
 * Confidence Thresholds
 * 
 * These thresholds determine AI response eligibility:
 * - RELEVANCE_MIN: Minimum relevance confidence to consider message relevant
 * - INTENT_MIN_DRAFT: Minimum intent confidence to generate draft
 * - INTENT_MIN_NO_ESCALATION: Minimum intent confidence to avoid escalation
 */
export const RELEVANCE_MIN = 0.70;
export const INTENT_MIN_DRAFT = 0.75;
export const INTENT_MIN_NO_ESCALATION = 0.85;

/**
 * Decision Type
 * 
 * Represents the AI decision outcome based on confidence thresholds.
 */
export enum DecisionType {
  /**
   * IGNORE: Message is not relevant or confidence is too low.
   * No AI response, no escalation.
   */
  IGNORE = 'IGNORE',

  /**
   * ESCALATE_ONLY: Message is relevant but intent confidence is below draft threshold.
   * Escalate to human, no AI draft.
   */
  ESCALATE_ONLY = 'ESCALATE_ONLY',

  /**
   * DRAFT_AND_ESCALATE: Message is relevant, intent confidence is above draft threshold
   * but below no-escalation threshold.
   * Generate AI draft AND escalate to human for review.
   */
  DRAFT_AND_ESCALATE = 'DRAFT_AND_ESCALATE',

  /**
   * DRAFT_ONLY: Message is relevant and intent confidence is high enough.
   * Generate AI draft, no escalation needed.
   */
  DRAFT_ONLY = 'DRAFT_ONLY',
}

/**
 * Reason Code
 * 
 * Explains why a specific decision was made.
 */
export enum ReasonCode {
  /**
   * LOW_RELEVANCE: Relevance confidence is below RELEVANCE_MIN threshold.
   */
  LOW_RELEVANCE = 'LOW_RELEVANCE',

  /**
   * LOW_INTENT: Intent confidence is below INTENT_MIN_DRAFT threshold.
   */
  LOW_INTENT = 'LOW_INTENT',

  /**
   * MEDIUM_CONFIDENCE: Intent confidence is between INTENT_MIN_DRAFT and INTENT_MIN_NO_ESCALATION.
   * Requires human review.
   */
  MEDIUM_CONFIDENCE = 'MEDIUM_CONFIDENCE',

  /**
   * HIGH_CONFIDENCE: Intent confidence is above INTENT_MIN_NO_ESCALATION.
   * Safe for AI draft without escalation.
   */
  HIGH_CONFIDENCE = 'HIGH_CONFIDENCE',
}

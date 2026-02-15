/**
 * Summary Update Policy (RALPH-safe)
 *
 * Pure function. Deterministic. No side effects.
 * Decides when a conversation summary needs regeneration.
 *
 * Trigger conditions (OR logic — any one is sufficient):
 *   1. message_count_since_last_summary >= MESSAGE_THRESHOLD
 *   2. intent changed (e.g. info → booking)
 *   3. booking state changed (e.g. draft → pending)
 *   4. estimated token count exceeds soft budget
 */

// ── Configuration ────────────────────────────────────────────────────────────

/** Minimum messages before triggering a summary refresh. */
export const MESSAGE_THRESHOLD = 10;

/** Soft token budget — when context exceeds this, force a summary. */
export const TOKEN_BUDGET_SOFT_LIMIT = 2000;

/** Rough estimation: 1 token ≈ 4 characters. */
const CHARS_PER_TOKEN = 4;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SummaryPolicyInput {
  /** Number of messages since the last summary was generated. */
  messageCountSinceLast: number;
  /** True if the classified intent has changed since the last summary. */
  intentChanged: boolean;
  /** True if the booking state has changed since the last summary. */
  bookingStateChanged: boolean;
  /** Estimated total tokens if all context were sent to the LLM (without summary). */
  estimatedTokens: number;
}

export interface SummaryPolicyOutput {
  /** Whether the summary should be regenerated. */
  shouldUpdate: boolean;
  /** The reason that triggered the update (for audit). */
  reason: SummaryTriggerReason | null;
}

export type SummaryTriggerReason =
  | 'message_threshold'
  | 'intent_changed'
  | 'booking_state_changed'
  | 'token_budget_exceeded';

// ── Pure function ────────────────────────────────────────────────────────────

/**
 * Decides whether a conversation summary should be regenerated.
 *
 * Evaluated on every inbound message. Returns immediately.
 * Never throws.
 */
export function shouldUpdateSummary(input: SummaryPolicyInput): SummaryPolicyOutput {
  if (input.messageCountSinceLast >= MESSAGE_THRESHOLD) {
    return { shouldUpdate: true, reason: 'message_threshold' };
  }

  if (input.intentChanged) {
    return { shouldUpdate: true, reason: 'intent_changed' };
  }

  if (input.bookingStateChanged) {
    return { shouldUpdate: true, reason: 'booking_state_changed' };
  }

  if (input.estimatedTokens > TOKEN_BUDGET_SOFT_LIMIT) {
    return { shouldUpdate: true, reason: 'token_budget_exceeded' };
  }

  return { shouldUpdate: false, reason: null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Rough token estimate from a list of message texts.
 * Uses the standard ~4 chars per token heuristic.
 */
export function estimateTokens(texts: string[]): number {
  let totalChars = 0;
  for (const t of texts) {
    totalChars += t.length;
  }
  return Math.ceil(totalChars / CHARS_PER_TOKEN);
}

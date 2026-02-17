/**
 * Customer Context Prompt Builder (Loop C)
 *
 * Converts structured booking context into a safe, factual prompt section.
 * Pure function. No side effects. No DB access.
 *
 * Output rules:
 *   - Only factual, historical data
 *   - Explicit anti-auto-booking guardrail
 *   - Never prescriptive ("suggest X"), only descriptive ("last time was X")
 *   - Max ~150 tokens to avoid bloating prompt
 */

export interface CustomerContextInput {
  lastDurationMinutes?: number | null;
  lastBookingDate?: string | null;
  completedCount?: number;
  lastNotes?: string | null;
  customerDisplayName?: string | null;
}

/**
 * Builds a customer context section for the system prompt.
 * Returns null if there's no meaningful context to include.
 */
export function buildCustomerContextPrompt(
  ctx: CustomerContextInput | null | undefined,
): string | null {
  if (!ctx) return null;

  const lines: string[] = [];

  if (ctx.customerDisplayName) {
    lines.push(`- Customer name: ${ctx.customerDisplayName}`);
  }
  if (ctx.completedCount != null && ctx.completedCount > 0) {
    lines.push(`- Completed lessons with this instructor: ${ctx.completedCount}`);
  }
  if (ctx.lastDurationMinutes != null) {
    lines.push(`- Last lesson duration: ${ctx.lastDurationMinutes} minutes`);
  }
  if (ctx.lastBookingDate) {
    lines.push(`- Last lesson date: ${ctx.lastBookingDate}`);
  }
  if (ctx.lastNotes) {
    // Truncate notes to avoid prompt bloat (max 120 chars)
    const truncated = ctx.lastNotes.length > 120
      ? ctx.lastNotes.slice(0, 120) + '...'
      : ctx.lastNotes;
    lines.push(`- Notes from last lesson: ${truncated}`);
  }

  if (lines.length === 0) return null;

  return [
    'Customer history (factual, not prescriptive):',
    ...lines,
    '',
    'Use this only as reference when the customer refers to previous lessons (e.g. "same as last time").',
    'Do not auto-create bookings. Suggest clarifications if any detail is missing.',
    'Do not assume the customer wants the same parameters unless they explicitly say so.',
  ].join('\n');
}

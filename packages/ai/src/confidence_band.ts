/**
 * Confidence Band (5 levels)
 *
 * Pure, deterministic mapping from a numeric confidence score (0–1)
 * to a discrete band used for orchestration (UI behavior, draft eligibility,
 * escalation routing).
 *
 * No magic. No inference. No side effects.
 *
 * Band → UI behavior:
 *   A_CERTAIN  → 1 strong suggestion + CTA "Use"
 *   B_HIGH     → 1 suggestion + 1 brief alternative
 *   C_MEDIUM   → 2 options + "Ask clarifying question"
 *   D_LOW      → clarification questions only (no draft booking)
 *   E_UNKNOWN  → badge "Needs human" + suggest "take over"
 */

export type ConfidenceBand =
  | 'A_CERTAIN'
  | 'B_HIGH'
  | 'C_MEDIUM'
  | 'D_LOW'
  | 'E_UNKNOWN';

/**
 * Maps a numeric confidence score to a 5-level band.
 *
 * @param score  A number in [0, 1]. Values outside range are clamped.
 * @returns The corresponding ConfidenceBand.
 */
export function mapConfidenceToBand(score: number): ConfidenceBand {
  // Clamp to [0, 1]
  const s = Math.max(0, Math.min(1, score));

  if (s >= 0.92) return 'A_CERTAIN';
  if (s >= 0.82) return 'B_HIGH';
  if (s >= 0.68) return 'C_MEDIUM';
  if (s >= 0.50) return 'D_LOW';
  return 'E_UNKNOWN';
}

/**
 * Returns true when the band allows draft generation.
 * A, B, C → true; D, E → false.
 */
export function bandAllowsDraft(band: ConfidenceBand): boolean {
  return band === 'A_CERTAIN' || band === 'B_HIGH' || band === 'C_MEDIUM';
}

/**
 * Returns true when the band requires human escalation.
 * D, E → true; C → true (with draft); A, B → false.
 */
export function bandRequiresEscalation(band: ConfidenceBand): boolean {
  return band === 'C_MEDIUM' || band === 'D_LOW' || band === 'E_UNKNOWN';
}

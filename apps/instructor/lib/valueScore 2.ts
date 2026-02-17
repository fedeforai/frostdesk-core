/**
 * Value score 0–100 and "Why" description. Mirrors @frostdesk/db computeCustomerValueScore.
 * Recency: last_seen_at (<7d → 30, <30d → 20, <90d → 10).
 * Notes: notes_count × 5 (max 25).
 * Tenure: first_seen_at >6 months → 10.
 * Bookings: bookings_count × 10 (max 40).
 */

export type ValueScoreParams = {
  lastSeenAt: string | null;
  notesCount: number;
  firstSeenAt?: string | null;
  bookingsCount?: number;
};

export function getValueScoreAndWhy(params: ValueScoreParams): { score: number; why: string } {
  let recency = 0;
  if (params.lastSeenAt) {
    const days = (Date.now() - new Date(params.lastSeenAt).getTime()) / (24 * 60 * 60 * 1000);
    if (days < 7) recency = 30;
    else if (days < 30) recency = 20;
    else if (days < 90) recency = 10;
  }
  const notesPts = Math.min(25, (params.notesCount || 0) * 5);
  let tenure = 0;
  if (params.firstSeenAt) {
    const days = (Date.now() - new Date(params.firstSeenAt).getTime()) / (24 * 60 * 60 * 1000);
    if (days > 180) tenure = 10;
  }
  const bookingsPts = Math.min(40, (params.bookingsCount || 0) * 10);
  const score = Math.min(100, recency + notesPts + tenure + bookingsPts);
  const parts: string[] = [];
  parts.push(`Recency: ${recency} pts`);
  parts.push(`Notes: ${notesPts} pts`);
  parts.push(`Tenure: ${tenure} pts`);
  if ((params.bookingsCount ?? 0) > 0) parts.push(`Bookings: ${bookingsPts} pts`);
  const why = parts.join(' · ');
  return { score, why };
}

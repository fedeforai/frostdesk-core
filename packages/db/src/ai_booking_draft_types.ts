/**
 * AI Booking Draft
 * ----------------
 * Ephemeral, READ-ONLY representation of a proposed booking.
 * This object MUST NEVER be persisted or mutated.
 */

export interface AIBookingDraft {
  /**
   * Who the draft is for
   */
  instructor_id: string;

  /**
   * Proposed booking time
   */
  start_time: string; // ISO string
  end_time: string;   // ISO string

  /**
   * Optional contextual fields
   */
  service_id?: string | null;
  meeting_point_id?: string | null;

  /**
   * Customer context (raw, unvalidated)
   */
  customer_name?: string | null;

  /**
   * Free text note explaining WHY this draft exists
   * (not generated text, no explanation logic here)
   */
  draft_reason: string;

  /**
   * Metadata (ephemeral, non-persisted)
   */
  created_at: string; // ISO string
}

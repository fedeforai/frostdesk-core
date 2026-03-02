/**
 * Minimal fields required for the instructor to decide whether to confirm
 * a booking and send the payment link (which blocks the calendar slot).
 *
 * The person making the booking must provide all of these before we consider
 * the request "ready for confirmation".
 */

/** Field keys used in extraction completeness (must match ExtractedBookingFields). */
export const CONFIRMATION_MINIMAL_FIELD_KEYS = [
  'date',
  'startTime',
  'partySize',
  'customerName',
] as const;

/** Human-readable labels for missing-field hints (optional for UI). */
export const CONFIRMATION_FIELD_LABELS: Record<string, string> = {
  date: 'Date',
  startTime: 'Start time',
  endTime_or_duration: 'Duration or end time',
  partySize: 'Number of participants',
  customerName: 'Name',
  guestName: 'Guest name',
  skillLevel: 'Level (optional)',
  meetingPointText: 'Meeting point (optional)',
  resort: 'Resort (optional)',
};

/** List of minimal field names for prompt/summary (string form). */
export const CONFIRMATION_MINIMAL_FIELDS_LIST = [
  'date',
  'time (start + duration or end)',
  'party_size',
  'name (customer or guest for third-party)',
] as const;

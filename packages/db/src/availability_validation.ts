/**
 * Availability enforcement: validates a booking time window is conflict-free.
 *
 * Reuses getCalendarConflicts() which checks:
 *   - Confirmed/modified bookings (internal)
 *   - External calendar events (Google, etc.)
 *
 * Does NOT duplicate overlap logic. Single source of truth.
 * Read-only. No side effects. No schema changes.
 */

import { getCalendarConflicts } from './calendar_conflict_repository.js';
import type { CalendarConflictDto } from './calendar_conflict_repository.js';

export class AvailabilityConflictError extends Error {
  public readonly conflicts: CalendarConflictDto[];

  constructor(conflicts: CalendarConflictDto[]) {
    super('Availability conflict: requested time window is not available');
    this.name = 'AvailabilityConflictError';
    this.conflicts = conflicts;
  }
}

export interface ValidateAvailabilityParams {
  instructorId: string;
  startUtc: string;
  endUtc: string;
  /** Exclude a booking from conflict check (for edits). */
  excludeBookingId?: string | null;
}

/**
 * Validates that the requested time window has no conflicts.
 * Throws AvailabilityConflictError if any conflict exists.
 * Returns void on success.
 */
export async function validateAvailability(
  params: ValidateAvailabilityParams,
): Promise<void> {
  const { instructorId, startUtc, endUtc, excludeBookingId } = params;

  const conflicts = await getCalendarConflicts({
    instructorId,
    startTimeUtc: startUtc,
    endTimeUtc: endUtc,
    excludeBookingId: excludeBookingId ?? null,
  });

  if (conflicts.length > 0) {
    throw new AvailabilityConflictError(conflicts);
  }
}

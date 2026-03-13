/**
 * Availability enforcement: validates a booking time window is conflict-free.
 *
 * Uses two layers of validation:
 *   1. Calendar conflicts (bookings + external calendar events)
 *   2. Availability settings (buffer zones + minimum notice)
 *
 * Read-only. No side effects. No schema changes.
 */

import { getCalendarConflicts } from './calendar_conflict_repository.js';
import type { CalendarConflictDto } from './calendar_conflict_repository.js';
import { isSlotAvailable, getAvailabilitySettings } from './compute_available_slots.js';

export class AvailabilityConflictError extends Error {
  public readonly conflicts: CalendarConflictDto[];
  public readonly reason?: string;

  constructor(conflicts: CalendarConflictDto[], reason?: string) {
    super(reason ?? 'Availability conflict: requested time window is not available');
    this.name = 'AvailabilityConflictError';
    this.conflicts = conflicts;
    this.reason = reason;
  }
}

export interface ValidateAvailabilityParams {
  instructorId: string;
  startUtc: string;
  endUtc: string;
  /** Exclude a booking from conflict check (for edits). */
  excludeBookingId?: string | null;
  /** Skip buffer/notice validation (for admin overrides). */
  skipAvailabilitySettings?: boolean;
}

/**
 * Validates that the requested time window has no conflicts.
 * Checks:
 *   1. Calendar conflicts (bookings + external calendar)
 *   2. Availability settings (buffer zones + minimum notice) unless skipped
 *
 * Throws AvailabilityConflictError if any conflict exists.
 * Returns void on success.
 */
export async function validateAvailability(
  params: ValidateAvailabilityParams,
): Promise<void> {
  const { instructorId, startUtc, endUtc, excludeBookingId, skipAvailabilitySettings } = params;

  const conflicts = await getCalendarConflicts({
    instructorId,
    startTimeUtc: startUtc,
    endTimeUtc: endUtc,
    excludeBookingId: excludeBookingId ?? null,
  });

  if (conflicts.length > 0) {
    throw new AvailabilityConflictError(conflicts);
  }

  if (!skipAvailabilitySettings) {
    const result = await isSlotAvailable(instructorId, startUtc, endUtc, excludeBookingId ?? undefined);
    if (!result.available) {
      throw new AvailabilityConflictError([], result.reason);
    }
  }
}

/**
 * Gets availability validation info for a time slot.
 * Returns detailed information about why a slot may not be available.
 */
export async function getAvailabilityValidationInfo(
  instructorId: string,
  startUtc: string,
  endUtc: string,
): Promise<{
  available: boolean;
  conflicts: CalendarConflictDto[];
  settingsViolation?: string;
  settings: {
    buffer_before_minutes: number;
    buffer_after_minutes: number;
    min_notice_hours: number;
  };
}> {
  const conflicts = await getCalendarConflicts({
    instructorId,
    startTimeUtc: startUtc,
    endTimeUtc: endUtc,
    excludeBookingId: null,
  });

  const settings = await getAvailabilitySettings(instructorId);
  const slotCheck = await isSlotAvailable(instructorId, startUtc, endUtc);

  return {
    available: conflicts.length === 0 && slotCheck.available,
    conflicts,
    settingsViolation: slotCheck.available ? undefined : slotCheck.reason,
    settings: {
      buffer_before_minutes: settings.buffer_before_minutes,
      buffer_after_minutes: settings.buffer_after_minutes,
      min_notice_hours: settings.min_notice_hours,
    },
  };
}

/**
 * Compute Available Slots — Calendly-like model.
 *
 * Formula: Availability - (Calendar Events + Bookings + Buffer zones)
 * Then filter by minimum notice.
 *
 * This module wraps computeSellableSlots and applies instructor-specific
 * settings for buffer times and minimum advance notice.
 */

import { sql } from './client.js';
import { computeSellableSlots, type SellableSlot } from './compute_sellable_slots.js';

export interface AvailabilitySettings {
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_hours: number;
  slot_duration_minutes: number;
  timezone: string;
}

export interface AvailableSlot {
  start_utc: string;
  end_utc: string;
  meeting_point_id?: string | null;
  duration_minutes: number;
}

export interface ComputeAvailableSlotsParams {
  instructorId: string;
  fromUtc: string;
  toUtc: string;
  /** Override settings (for testing). If not provided, fetched from DB. */
  settings?: AvailabilitySettings;
}

export interface ComputeAvailableSlotsResult {
  slots: AvailableSlot[];
  settings: AvailabilitySettings;
}

/**
 * Fetches availability settings for an instructor.
 * Returns defaults if columns don't exist yet (migration not applied).
 */
export async function getAvailabilitySettings(
  instructorId: string
): Promise<AvailabilitySettings> {
  const result = await sql<Array<{
    buffer_before_minutes: number | null;
    buffer_after_minutes: number | null;
    min_notice_hours: number | null;
    slot_duration_minutes: number | null;
    timezone: string | null;
  }>>`
    SELECT 
      buffer_before_minutes,
      buffer_after_minutes,
      min_notice_hours,
      slot_duration_minutes,
      timezone
    FROM instructor_profiles
    WHERE id = ${instructorId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return {
      buffer_before_minutes: 0,
      buffer_after_minutes: 15,
      min_notice_hours: 24,
      slot_duration_minutes: 60,
      timezone: 'UTC',
    };
  }

  const row = result[0];
  return {
    buffer_before_minutes: row.buffer_before_minutes ?? 0,
    buffer_after_minutes: row.buffer_after_minutes ?? 15,
    min_notice_hours: row.min_notice_hours ?? 24,
    slot_duration_minutes: row.slot_duration_minutes ?? 60,
    timezone: row.timezone ?? 'UTC',
  };
}

/**
 * Updates availability settings for an instructor.
 */
export async function updateAvailabilitySettings(
  instructorId: string,
  settings: Partial<AvailabilitySettings>
): Promise<AvailabilitySettings> {
  await sql`
    UPDATE instructor_profiles
    SET
      buffer_before_minutes = COALESCE(${settings.buffer_before_minutes ?? null}, buffer_before_minutes),
      buffer_after_minutes = COALESCE(${settings.buffer_after_minutes ?? null}, buffer_after_minutes),
      min_notice_hours = COALESCE(${settings.min_notice_hours ?? null}, min_notice_hours),
      slot_duration_minutes = COALESCE(${settings.slot_duration_minutes ?? null}, slot_duration_minutes),
      updated_at = NOW()
    WHERE id = ${instructorId}
  `;

  return getAvailabilitySettings(instructorId);
}

/**
 * Applies buffer zones around busy periods.
 * For each booking/event, the effective busy period is:
 *   [start - buffer_before, end + buffer_after]
 */
function applyBufferToSlots(
  slots: SellableSlot[],
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
  bookings: Array<{ start_time: string; end_time: string }>
): SellableSlot[] {
  if (bufferBeforeMinutes === 0 && bufferAfterMinutes === 0) {
    return slots;
  }

  let result = slots;

  for (const booking of bookings) {
    const bookingStart = new Date(booking.start_time).getTime();
    const bookingEnd = new Date(booking.end_time).getTime();

    const bufferStart = bookingStart - bufferBeforeMinutes * 60 * 1000;
    const bufferEnd = bookingEnd + bufferAfterMinutes * 60 * 1000;

    result = result.flatMap(slot => {
      const slotStart = new Date(slot.start_utc).getTime();
      const slotEnd = new Date(slot.end_utc).getTime();

      if (slotEnd <= bufferStart || slotStart >= bufferEnd) {
        return [slot];
      }

      const parts: SellableSlot[] = [];

      if (slotStart < bufferStart) {
        parts.push({
          start_utc: slot.start_utc,
          end_utc: new Date(bufferStart).toISOString(),
          meeting_point_id: slot.meeting_point_id,
        });
      }

      if (slotEnd > bufferEnd) {
        parts.push({
          start_utc: new Date(bufferEnd).toISOString(),
          end_utc: slot.end_utc,
          meeting_point_id: slot.meeting_point_id,
        });
      }

      return parts;
    });
  }

  return result;
}

/**
 * Filters slots that don't meet minimum notice requirement.
 */
function applyMinNotice(
  slots: SellableSlot[],
  minNoticeHours: number,
  now: Date
): SellableSlot[] {
  if (minNoticeHours <= 0) {
    return slots;
  }

  const minStartTime = now.getTime() + minNoticeHours * 60 * 60 * 1000;

  return slots.filter(slot => {
    const slotStart = new Date(slot.start_utc).getTime();
    return slotStart >= minStartTime;
  });
}

/**
 * Computes available slots for an instructor using Calendly-like logic:
 * 1. Get base sellable slots (availability - bookings - calendar events)
 * 2. Apply buffer zones around bookings
 * 3. Filter by minimum notice
 * 4. Return slots with duration info
 */
export async function computeAvailableSlots(
  params: ComputeAvailableSlotsParams
): Promise<ComputeAvailableSlotsResult> {
  const { instructorId, fromUtc, toUtc } = params;

  const settings = params.settings ?? await getAvailabilitySettings(instructorId);

  const baseSlots = await computeSellableSlots({
    instructorId,
    fromUtc,
    toUtc,
    timezone: settings.timezone,
    applyBookingRules: true,
  });

  const bookings = await getConfirmedBookingsInRange(instructorId, fromUtc, toUtc);

  let slots = applyBufferToSlots(
    baseSlots,
    settings.buffer_before_minutes,
    settings.buffer_after_minutes,
    bookings
  );

  slots = applyMinNotice(slots, settings.min_notice_hours, new Date());

  const availableSlots: AvailableSlot[] = slots.map(slot => ({
    start_utc: slot.start_utc,
    end_utc: slot.end_utc,
    meeting_point_id: slot.meeting_point_id,
    duration_minutes: Math.round(
      (new Date(slot.end_utc).getTime() - new Date(slot.start_utc).getTime()) / 60000
    ),
  }));

  return {
    slots: availableSlots,
    settings,
  };
}

/**
 * Helper to get confirmed bookings for buffer calculation.
 */
async function getConfirmedBookingsInRange(
  instructorId: string,
  fromUtc: string,
  toUtc: string
): Promise<Array<{ start_time: string; end_time: string }>> {
  const result = await sql<Array<{ start_time: string; end_time: string }>>`
    SELECT start_time, end_time
    FROM bookings
    WHERE instructor_id = ${instructorId}
      AND booking_status IN ('confirmed', 'modified')
      AND start_time < ${toUtc}
      AND end_time > ${fromUtc}
    ORDER BY start_time
  `;
  return result;
}

/**
 * Validates if a specific time slot is available.
 * Used for booking creation validation.
 */
export async function isSlotAvailable(
  instructorId: string,
  startUtc: string,
  endUtc: string,
  excludeBookingId?: string
): Promise<{ available: boolean; reason?: string }> {
  const settings = await getAvailabilitySettings(instructorId);
  const now = new Date();

  const minStartTime = now.getTime() + settings.min_notice_hours * 60 * 60 * 1000;
  const requestedStart = new Date(startUtc).getTime();

  if (requestedStart < minStartTime) {
    return {
      available: false,
      reason: `Minimum ${settings.min_notice_hours}h advance notice required`,
    };
  }

  const { slots } = await computeAvailableSlots({
    instructorId,
    fromUtc: startUtc,
    toUtc: endUtc,
    settings,
  });

  const requestedEnd = new Date(endUtc).getTime();
  const requestedDuration = requestedEnd - requestedStart;

  for (const slot of slots) {
    const slotStart = new Date(slot.start_utc).getTime();
    const slotEnd = new Date(slot.end_utc).getTime();

    if (slotStart <= requestedStart && slotEnd >= requestedEnd) {
      return { available: true };
    }
  }

  return {
    available: false,
    reason: 'Time slot is not available (conflict with booking, calendar event, or buffer)',
  };
}

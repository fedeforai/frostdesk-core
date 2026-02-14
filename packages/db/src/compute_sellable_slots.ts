/**
 * Core domain: compute vendible (sellable) slots for an instructor in a UTC time range.
 * Formula: (recurring availability + add overrides - remove overrides - bookings - external_busy_blocks).
 * All times in UTC. Deterministic and testable.
 */

import { getInstructorAvailability } from './instructor_availability_repository.js';
import type { InstructorAvailability } from './instructor_availability_repository.js';
import { listAvailabilityOverridesInRange } from './availability_overrides_repository.js';
import type { InstructorAvailabilityOverride } from './availability_overrides_repository.js';
import { listExternalBusyBlocksInRange } from './external_busy_blocks_repository.js';
import type { ExternalBusyBlock } from './external_busy_blocks_repository.js';
import { getConfirmedOrModifiedBookingsInRange } from './booking_repository.js';
import type { ComputeSellableSlotsInput } from './instructor_domain.js';

export interface SellableSlot {
  start_utc: string;
  end_utc: string;
}

/** One excluded range with reason (for debugging). */
export interface ExcludedRange {
  start_utc: string;
  end_utc: string;
  reason: string;
}

/** Result of pure computeSellableSlotsFromInput when includeExclusionReasons is true. */
export interface ComputeSellableSlotsResult {
  slots: SellableSlot[];
  excluded_ranges?: ExcludedRange[];
}

/** Optional deps for testing; when omitted, real repositories are used. */
export interface ComputeSellableSlotsDeps {
  getInstructorAvailability: (instructorId: string) => Promise<InstructorAvailability[]>;
  listAvailabilityOverridesInRange: (instructorId: string, startUtc: string, endUtc: string) => Promise<InstructorAvailabilityOverride[]>;
  getConfirmedOrModifiedBookingsInRange: (instructorId: string, startUtc: string, endUtc: string) => Promise<Array<{ start_time: string; end_time: string }>>;
  listExternalBusyBlocksInRange: (instructorId: string, startUtc: string, endUtc: string) => Promise<ExternalBusyBlock[]>;
}

export interface ComputeSellableSlotsParams {
  instructorId: string;
  fromUtc: string;
  toUtc: string;
  /** Instructor timezone (IANA, e.g. Europe/Rome). Used only to expand recurring windows to UTC. Default UTC. */
  timezone?: string;
  /** Inject deps for tests; omit in production. */
  deps?: ComputeSellableSlotsDeps;
}

/**
 * Pure function: compute sellable slots from normalized inputs (no I/O).
 * Use for testing and when data is already loaded. Optionally returns excluded ranges with reasons.
 */
export function computeSellableSlotsFromInput(
  input: ComputeSellableSlotsInput,
  options?: { includeExclusionReasons?: boolean }
): ComputeSellableSlotsResult {
  const { from_utc, to_utc, timezone, availability_windows, overrides, bookings, external_busy_blocks } = input;
  const fromMs = new Date(from_utc).getTime();
  const toMs = new Date(to_utc).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || fromMs >= toMs) {
    return { slots: [] };
  }

  const excluded: ExcludedRange[] = [];
  const activeRecurring = availability_windows.filter((w) => w.is_active);
  let slots = expandRecurringToUtcSlots(activeRecurring, from_utc, to_utc, timezone);

  for (const o of overrides) {
    const block = { start: new Date(o.start_utc).getTime(), end: new Date(o.end_utc).getTime() };
    if (o.is_available) {
      slots = mergeSlots(slots, [{ start_utc: o.start_utc, end_utc: o.end_utc }]);
    } else {
      if (options?.includeExclusionReasons) {
        excluded.push({ start_utc: o.start_utc, end_utc: o.end_utc, reason: 'availability_override_block' });
      }
      slots = subtractBlockFromSlots(slots, block);
    }
  }

  for (const b of bookings) {
    if (options?.includeExclusionReasons) {
      excluded.push({ start_utc: b.start_time, end_utc: b.end_time, reason: 'booking' });
    }
    slots = subtractBlockFromSlots(slots, {
      start: new Date(b.start_time).getTime(),
      end: new Date(b.end_time).getTime(),
    });
  }

  for (const busy of external_busy_blocks) {
    if (options?.includeExclusionReasons) {
      excluded.push({ start_utc: busy.start_utc, end_utc: busy.end_utc, reason: 'external_calendar_busy' });
    }
    slots = subtractBlockFromSlots(slots, {
      start: new Date(busy.start_utc).getTime(),
      end: new Date(busy.end_utc).getTime(),
    });
  }

  const result: ComputeSellableSlotsResult = { slots: normalizeAndSort(slots) };
  if (options?.includeExclusionReasons && excluded.length > 0) {
    result.excluded_ranges = excluded;
  }
  return result;
}

/**
 * Returns contiguous sellable slots in [fromUtc, toUtc].
 * Used by GET /instructor/availability/slots and any slot-based booking flow.
 */
export async function computeSellableSlots(
  params: ComputeSellableSlotsParams
): Promise<SellableSlot[]> {
  const { instructorId, fromUtc, toUtc, deps } = params;
  const tz = params.timezone ?? 'UTC';

  const getAvailability = deps?.getInstructorAvailability ?? getInstructorAvailability;
  const getOverrides = deps?.listAvailabilityOverridesInRange ?? listAvailabilityOverridesInRange;
  const getBookings = deps?.getConfirmedOrModifiedBookingsInRange ?? getConfirmedOrModifiedBookingsInRange;
  const getBusyBlocks = deps?.listExternalBusyBlocksInRange ?? listExternalBusyBlocksInRange;

  const [recurring, overrides, bookings, busyBlocks] = await Promise.all([
    getAvailability(instructorId),
    getOverrides(instructorId, fromUtc, toUtc),
    getBookings(instructorId, fromUtc, toUtc),
    getBusyBlocks(instructorId, fromUtc, toUtc),
  ]);

  const input: ComputeSellableSlotsInput = {
    from_utc: fromUtc,
    to_utc: toUtc,
    timezone: tz,
    availability_windows: recurring.map((r) => ({
      day_of_week: r.day_of_week,
      start_time: r.start_time,
      end_time: r.end_time,
      is_active: r.is_active,
    })),
    overrides: overrides.map((o) => ({ start_utc: o.start_utc, end_utc: o.end_utc, is_available: o.is_available })),
    bookings: bookings.map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
    external_busy_blocks: busyBlocks.map((b) => ({ start_utc: b.start_utc, end_utc: b.end_utc })),
  };
  const result = computeSellableSlotsFromInput(input);
  return result.slots;
}

/**
 * Expands recurring weekly windows to UTC slots in [fromUtc, toUtc].
 * day_of_week 0=Sunday..6=Saturday (UTC); start_time/end_time are time-of-day in UTC (HH:mm).
 * Exported for unit tests only.
 */
export function expandRecurringToUtcSlots(
  recurring: Array<{ day_of_week: number; start_time: string; end_time: string }>,
  fromUtc: string,
  toUtc: string,
  _timezone: string
): SellableSlot[] {
  const slots: SellableSlot[] = [];
  const from = new Date(fromUtc).getTime();
  const to = new Date(toUtc).getTime();
  const cursor = new Date(fromUtc);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(toUtc);
  endDay.setUTCHours(23, 59, 59, 999);

  while (cursor.getTime() <= endDay.getTime()) {
    const dayOfWeek = cursor.getUTCDay();
    for (const w of recurring) {
      if (w.day_of_week !== dayOfWeek) continue;
      const startMs = timeOfDayToUtcMs(cursor, w.start_time);
      const endMs = timeOfDayToUtcMs(cursor, w.end_time);
      if (endMs <= startMs) continue;
      const slotStart = Math.max(from, startMs);
      const slotEnd = Math.min(to, endMs);
      if (slotEnd > slotStart) {
        slots.push({
          start_utc: new Date(slotStart).toISOString(),
          end_utc: new Date(slotEnd).toISOString(),
        });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return mergeSlots(slots, []);
}

/** Parse HH:mm or HH:mm:ss on given UTC date, return UTC ms. */
function timeOfDayToUtcMs(date: Date, time: string): number {
  const [h, m, s] = time.split(':').map((x) => parseInt(x, 10) || 0);
  const ts = date.getTime();
  if (Number.isNaN(ts)) return NaN;
  const d = new Date(ts);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    h,
    m,
    s,
    0
  );
}

function subtractBlockFromSlots(
  slots: SellableSlot[],
  block: { start: number; end: number }
): SellableSlot[] {
  const out: SellableSlot[] = [];
  for (const s of slots) {
    const start = new Date(s.start_utc).getTime();
    const end = new Date(s.end_utc).getTime();
    if (end <= block.start || start >= block.end) {
      out.push(s);
      continue;
    }
    if (start < block.start) {
      out.push({ start_utc: s.start_utc, end_utc: new Date(block.start).toISOString() });
    }
    if (end > block.end) {
      out.push({ start_utc: new Date(block.end).toISOString(), end_utc: s.end_utc });
    }
  }
  return normalizeAndSort(out);
}

function mergeSlots(existing: SellableSlot[], toAdd: SellableSlot[]): SellableSlot[] {
  return normalizeAndSort([...existing, ...toAdd]);
}

function normalizeAndSort(slots: SellableSlot[]): SellableSlot[] {
  if (slots.length === 0) return [];
  const asRanges = slots
    .map((s) => ({ start: new Date(s.start_utc).getTime(), end: new Date(s.end_utc).getTime() }))
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of asRanges) {
    if (merged.length > 0 && r.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, r.end);
    } else {
      merged.push({ start: r.start, end: r.end });
    }
  }
  return merged.map((r) => ({
    start_utc: new Date(r.start).toISOString(),
    end_utc: new Date(r.end).toISOString(),
  }));
}

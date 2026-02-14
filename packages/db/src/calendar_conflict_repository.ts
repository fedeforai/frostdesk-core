/**
 * Loop 4: Read-only calendar conflict detection.
 * No writes. No booking changes. Conflicts computed on-demand.
 * Source: docs/diagrams/CALENDAR_READ_FIRST (UI contract).
 */

import { sql } from './client.js';

export type ConflictSource = 'internal_booking' | 'external_calendar';
export type ConflictProvider = 'google' | 'outlook' | 'internal' | null;

export interface CalendarConflictDto {
  source: ConflictSource;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  title: string | null;
  provider: ConflictProvider;
}

export interface GetCalendarConflictsParams {
  instructorId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  excludeBookingId?: string | null;
}

/**
 * Returns conflicts in the given UTC time window.
 * Internal = confirmed/modified bookings. External = cached calendar events.
 * Does not persist anything. Idempotent.
 */
export async function getCalendarConflicts(
  params: GetCalendarConflictsParams
): Promise<CalendarConflictDto[]> {
  const { instructorId, startTimeUtc, endTimeUtc, excludeBookingId } = params;

  const conflicts: CalendarConflictDto[] = [];

  // Internal: bookings (confirmed, modified) overlapping window
  const bookingRows = excludeBookingId
    ? await sql<Array<{ id: string; start_time: string; end_time: string; customer_name: string | null }>>`
        SELECT id, start_time, end_time, customer_name
        FROM bookings
        WHERE instructor_id = ${instructorId}
          AND status IN ('confirmed', 'modified')
          AND start_time IS NOT NULL
          AND end_time IS NOT NULL
          AND start_time::timestamptz < ${endTimeUtc}::timestamptz
          AND end_time::timestamptz > ${startTimeUtc}::timestamptz
          AND id != ${excludeBookingId}
      `
    : await sql<Array<{ id: string; start_time: string; end_time: string; customer_name: string | null }>>`
        SELECT id, start_time, end_time, customer_name
        FROM bookings
        WHERE instructor_id = ${instructorId}
          AND status IN ('confirmed', 'modified')
          AND start_time IS NOT NULL
          AND end_time IS NOT NULL
          AND start_time::timestamptz < ${endTimeUtc}::timestamptz
          AND end_time::timestamptz > ${startTimeUtc}::timestamptz
      `;

  for (const row of bookingRows) {
    const start = row.start_time;
    const end = row.end_time;
    const durationMinutes = durationMinutesBetween(start, end);
    conflicts.push({
      source: 'internal_booking',
      start_time: start,
      end_time: end,
      duration_minutes: durationMinutes,
      title: row.customer_name ?? 'Booking',
      provider: 'internal',
    });
  }

  // External: calendar_events_cache overlapping window
  const eventRows = await sql<Array<{ start_at: string; end_at: string; title: string | null; provider: string }>>`
    SELECT start_at, end_at, title, provider
    FROM calendar_events_cache
    WHERE instructor_id = ${instructorId}
      AND start_at::timestamptz < ${endTimeUtc}::timestamptz
      AND end_at::timestamptz > ${startTimeUtc}::timestamptz
    ORDER BY start_at ASC
  `;

  for (const row of eventRows) {
    const start = row.start_at;
    const end = row.end_at;
    const durationMinutes = durationMinutesBetween(start, end);
    const provider: ConflictProvider =
      row.provider === 'google' ? 'google' : row.provider === 'outlook' ? 'outlook' : null;
    conflicts.push({
      source: 'external_calendar',
      start_time: start,
      end_time: end,
      duration_minutes: durationMinutes,
      title: row.title ?? null,
      provider,
    });
  }

  return conflicts;
}

function durationMinutesBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (end <= start) return 0;
  return Math.round((end - start) / 60000);
}

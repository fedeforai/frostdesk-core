import { sql } from './client.js';

export interface CalendarEventCache {
  id: string;
  instructor_id: string;
  provider: string;
  external_event_id: string;
  start_at: string;
  end_at: string;
  title: string | null;
  is_all_day: boolean;
  created_at: string;
}

export interface InsertCalendarEventParams {
  instructor_id: string;
  provider: string;
  external_event_id: string;
  start_at: string;
  end_at: string;
  title: string | null;
  is_all_day: boolean;
}

/**
 * Clears all cached events for an instructor.
 * 
 * @param instructorId - Instructor ID
 */
export async function clearInstructorEvents(
  instructorId: string
): Promise<void> {
  await sql`
    DELETE FROM calendar_events_cache
    WHERE instructor_id = ${instructorId}
  `;
}

/**
 * Inserts calendar events into the cache.
 * 
 * @param events - Array of events to insert
 */
export async function insertCalendarEvents(
  events: InsertCalendarEventParams[]
): Promise<void> {
  if (events.length === 0) {
    return;
  }

  // Batch insert all events
  for (const event of events) {
    await sql`
      INSERT INTO calendar_events_cache (
        instructor_id,
        provider,
        external_event_id,
        start_at,
        end_at,
        title,
        is_all_day,
        created_at
      )
      VALUES (
        ${event.instructor_id},
        ${event.provider},
        ${event.external_event_id},
        ${event.start_at},
        ${event.end_at},
        ${event.title ?? null},
        ${event.is_all_day},
        NOW()
      )
    `;
  }
}

/**
 * Lists cached calendar events for an instructor.
 * 
 * @param instructorId - Instructor ID
 * @param dateFrom - Optional start date filter (ISO string)
 * @param dateTo - Optional end date filter (ISO string)
 * @returns Array of cached calendar events
 */
export async function listInstructorEvents(
  instructorId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<CalendarEventCache[]> {
  let result: CalendarEventCache[];

  if (dateFrom && dateTo) {
    result = await sql<CalendarEventCache[]>`
      SELECT 
        id,
        instructor_id,
        provider,
        external_event_id,
        start_at,
        end_at,
        title,
        is_all_day,
        created_at
      FROM calendar_events_cache
      WHERE instructor_id = ${instructorId}
        AND start_at >= ${dateFrom}
        AND start_at <= ${dateTo}
      ORDER BY start_at ASC
    `;
  } else if (dateFrom) {
    result = await sql<CalendarEventCache[]>`
      SELECT 
        id,
        instructor_id,
        provider,
        external_event_id,
        start_at,
        end_at,
        title,
        is_all_day,
        created_at
      FROM calendar_events_cache
      WHERE instructor_id = ${instructorId}
        AND start_at >= ${dateFrom}
      ORDER BY start_at ASC
    `;
  } else if (dateTo) {
    result = await sql<CalendarEventCache[]>`
      SELECT 
        id,
        instructor_id,
        provider,
        external_event_id,
        start_at,
        end_at,
        title,
        is_all_day,
        created_at
      FROM calendar_events_cache
      WHERE instructor_id = ${instructorId}
        AND start_at <= ${dateTo}
      ORDER BY start_at ASC
    `;
  } else {
    result = await sql<CalendarEventCache[]>`
      SELECT 
        id,
        instructor_id,
        provider,
        external_event_id,
        start_at,
        end_at,
        title,
        is_all_day,
        created_at
      FROM calendar_events_cache
      WHERE instructor_id = ${instructorId}
      ORDER BY start_at ASC
    `;
  }

  return result;
}

import { sql } from './client.js';

export interface AvailabilityCalendarConflict {
  // Availability fields
  availability_id: string;
  availability_day_of_week: number;
  availability_start_time: string;
  availability_end_time: string;
  availability_is_active: boolean;
  
  // Calendar event fields
  calendar_event_id: string;
  calendar_event_external_id: string;
  calendar_event_start_at: string;
  calendar_event_end_at: string;
  calendar_event_title: string | null;
  calendar_event_is_all_day: boolean;
}

/**
 * Lists conflicts between instructor availability windows and calendar events.
 * A conflict exists when an availability window overlaps with a calendar event.
 * 
 * Overlap detection:
 * - For regular events: checks if day_of_week matches and time ranges overlap
 * - For all-day events: checks if day_of_week matches (conflicts with entire day)
 * 
 * @param instructorId - Instructor ID
 * @returns Array of conflicts, ordered by availability start time
 */
export async function listAvailabilityCalendarConflicts(
  instructorId: string
): Promise<AvailabilityCalendarConflict[]> {
  const result = await sql<AvailabilityCalendarConflict[]>`
    SELECT DISTINCT
      -- Availability fields
      av.id AS availability_id,
      av.day_of_week AS availability_day_of_week,
      av.start_time AS availability_start_time,
      av.end_time AS availability_end_time,
      av.is_active AS availability_is_active,
      
      -- Calendar event fields
      ce.id AS calendar_event_id,
      ce.external_event_id AS calendar_event_external_id,
      ce.start_at AS calendar_event_start_at,
      ce.end_at AS calendar_event_end_at,
      ce.title AS calendar_event_title,
      ce.is_all_day AS calendar_event_is_all_day
    FROM instructor_availability av
    INNER JOIN calendar_events_cache ce ON av.instructor_id = ce.instructor_id
    WHERE av.instructor_id = ${instructorId}
      AND av.is_active = true
      AND (
        -- Case 1: All-day event conflicts with any availability on that day
        (
          ce.is_all_day = true
          AND EXTRACT(DOW FROM ce.start_at::timestamp) = av.day_of_week
        )
        OR
        -- Case 2: Regular event - check if day matches and time ranges overlap
        (
          ce.is_all_day = false
          AND EXTRACT(DOW FROM ce.start_at::timestamp) = av.day_of_week
          AND (
            -- Time ranges overlap: availability_start < event_end AND availability_end > event_start
            av.start_time::time < ce.end_at::time
            AND av.end_time::time > ce.start_at::time
          )
        )
      )
    ORDER BY av.day_of_week ASC, av.start_time ASC, ce.start_at ASC
  `;

  return result;
}

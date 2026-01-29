import { sql } from './client.js';

export interface AIBookingSuggestionContext {
  availability: {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
  busySlots: {
    start_time: string;
    end_time: string;
  }[];
  recentBookings: {
    start_time: string;
    end_time: string;
  }[];
}

/**
 * Retrieves READ-ONLY context data for AI booking suggestions.
 * 
 * This function provides minimal, safe data that AI can read to generate
 * booking suggestions. No mutations, inferences, or side effects are performed.
 * 
 * @param instructorId - Instructor ID
 * @returns Context data for AI suggestions
 */
export async function getAIBookingSuggestionContext(
  instructorId: string
): Promise<AIBookingSuggestionContext> {
  // 1. Get instructor availability (active only)
  const availability = await sql<{
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[]>`
    SELECT
      id,
      day_of_week,
      start_time,
      end_time
    FROM instructor_availability
    WHERE instructor_id = ${instructorId}
      AND is_active = true
    ORDER BY day_of_week ASC, start_time ASC
  `;

  // 2. Get calendar busy slots (cached only, future events)
  // Note: Task specifies instructor_calendar_events_cache, but actual table is calendar_events_cache
  // Using actual table name with column aliasing to match expected output shape
  const now = new Date().toISOString();
  const busySlots = await sql<{
    start_time: string;
    end_time: string;
  }[]>`
    SELECT
      start_at as start_time,
      end_at as end_time
    FROM calendar_events_cache
    WHERE instructor_id = ${instructorId}
      AND start_at >= ${now}
    ORDER BY start_at ASC
    LIMIT 50
  `;

  // 3. Get recent bookings (last 14 days, context only)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoISO = fourteenDaysAgo.toISOString();

  const recentBookings = await sql<{
    start_time: string;
    end_time: string;
  }[]>`
    SELECT
      start_time,
      end_time
    FROM bookings
    WHERE instructor_id = ${instructorId}
      AND start_time >= ${fourteenDaysAgoISO}
    ORDER BY start_time DESC
    LIMIT 10
  `;

  return {
    availability,
    busySlots,
    recentBookings,
  };
}

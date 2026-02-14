import { sql } from './client.js';

export interface InstructorAvailabilityOverride {
  id: string;
  instructor_id: string;
  start_utc: string;
  end_utc: string;
  is_available: boolean;
  created_at: string;
}

/**
 * Lists overrides that overlap [startUtc, endUtc] for an instructor.
 */
export async function listAvailabilityOverridesInRange(
  instructorId: string,
  startUtc: string,
  endUtc: string
): Promise<InstructorAvailabilityOverride[]> {
  const result = await sql<InstructorAvailabilityOverride[]>`
    SELECT id, instructor_id, start_utc, end_utc, is_available, created_at
    FROM instructor_availability_overrides
    WHERE instructor_id = ${instructorId}
      AND start_utc::timestamptz < ${endUtc}::timestamptz
      AND end_utc::timestamptz > ${startUtc}::timestamptz
    ORDER BY start_utc ASC
  `;
  return result;
}

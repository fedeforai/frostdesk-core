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

export interface CreateAvailabilityOverrideParams {
  instructor_id: string;
  start_utc: string;
  end_utc: string;
  is_available: boolean;
}

/**
 * Creates a date-specific availability override (add extra window or block time).
 */
export async function createAvailabilityOverride(
  params: CreateAvailabilityOverrideParams
): Promise<InstructorAvailabilityOverride> {
  const rows = await sql<InstructorAvailabilityOverride[]>`
    INSERT INTO instructor_availability_overrides (instructor_id, start_utc, end_utc, is_available)
    VALUES (${params.instructor_id}, ${params.start_utc}::timestamptz, ${params.end_utc}::timestamptz, ${params.is_available})
    RETURNING id, instructor_id, start_utc, end_utc, is_available, created_at
  `;
  if (rows.length === 0) throw new Error('Failed to create availability override');
  return rows[0];
}

/**
 * Deletes an availability override by id. Verifies instructor_id so instructors can only delete their own.
 */
export async function deleteAvailabilityOverride(
  id: string,
  instructorId: string
): Promise<void> {
  const deleted = await sql`
    DELETE FROM instructor_availability_overrides
    WHERE id = ${id} AND instructor_id = ${instructorId}
    RETURNING id
  `;
  if (deleted.length === 0) {
    throw new Error(`Availability override not found or not owned: ${id}`);
  }
}

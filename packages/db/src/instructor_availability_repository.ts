import { sql } from './client.js';

export interface InstructorAvailability {
  id: string;
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class InstructorAvailabilityNotFoundError extends Error {
  constructor(id: string) {
    super(`Instructor availability not found: ${id}`);
    this.name = 'InstructorAvailabilityNotFoundError';
  }
}

export interface UpsertInstructorAvailabilityParams {
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface CreateInstructorAvailabilityParams {
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface UpdateInstructorAvailabilityParams {
  id: string;
  instructorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

/**
 * Gets all instructor availability rows for an instructor (active and inactive).
 *
 * @param instructorId - Instructor ID
 * @returns Array of instructor availability rows
 */
export async function getInstructorAvailability(
  instructorId: string
): Promise<InstructorAvailability[]> {
  const result = await sql<InstructorAvailability[]>`
    SELECT
      id,
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    FROM instructor_availability
    WHERE instructor_id = ${instructorId}
    ORDER BY day_of_week, start_time
  `;
  return result;
}

/**
 * Lists all instructor availability windows (active and inactive).
 * Alias for getInstructorAvailability for backward compatibility.
 */
export async function listInstructorAvailability(
  instructorId: string
): Promise<InstructorAvailability[]> {
  return getInstructorAvailability(instructorId);
}

/**
 * Upserts instructor availability: if a row exists with same instructor_id + day_of_week + start_time + end_time,
 * updates is_active and updated_at; otherwise inserts a new row.
 *
 * @param params - instructor_id, day_of_week, start_time, end_time, is_active
 * @returns The affected row (inserted or updated)
 */
export async function upsertInstructorAvailability(
  params: UpsertInstructorAvailabilityParams
): Promise<InstructorAvailability> {
  const { instructor_id, day_of_week, start_time, end_time, is_active } = params;

  const existing = await sql<InstructorAvailability[]>`
    SELECT
      id,
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    FROM instructor_availability
    WHERE instructor_id = ${instructor_id}
      AND day_of_week = ${day_of_week}
      AND start_time = ${start_time}
      AND end_time = ${end_time}
    LIMIT 1
  `;

  if (existing.length > 0) {
    const result = await sql<InstructorAvailability[]>`
      UPDATE instructor_availability
      SET is_active = ${is_active},
          updated_at = NOW()
      WHERE id = ${existing[0].id}
      RETURNING
        id,
        instructor_id,
        day_of_week,
        start_time,
        end_time,
        is_active,
        created_at,
        updated_at
    `;
    return result[0];
  }

  const result = await sql<InstructorAvailability[]>`
    INSERT INTO instructor_availability (
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      ${instructor_id},
      ${day_of_week},
      ${start_time},
      ${end_time},
      ${is_active},
      NOW(),
      NOW()
    )
    RETURNING
      id,
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
  `;
  return result[0];
}

/**
 * Creates a new instructor availability window.
 * 
 * @param params - Create parameters
 * @returns Created instructor availability window
 */
export async function createInstructorAvailability(
  params: CreateInstructorAvailabilityParams
): Promise<InstructorAvailability> {
  const { instructorId, dayOfWeek, startTime, endTime, isActive } = params;

  const result = await sql<InstructorAvailability[]>`
    INSERT INTO instructor_availability (
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${dayOfWeek},
      ${startTime},
      ${endTime},
      ${isActive},
      NOW(),
      NOW()
    )
    RETURNING 
      id,
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    `;

  if (result.length === 0) {
    throw new Error('Failed to create instructor availability');
  }

  return result[0];
}

/**
 * Updates an instructor availability window.
 * 
 * @param params - Update parameters
 * @returns Updated instructor availability window
 */
export async function updateInstructorAvailability(
  params: UpdateInstructorAvailabilityParams
): Promise<InstructorAvailability> {
  const { id, instructorId, dayOfWeek, startTime, endTime, isActive } = params;

  const result = await sql<InstructorAvailability[]>`
    UPDATE instructor_availability
    SET 
      day_of_week = ${dayOfWeek},
      start_time = ${startTime},
      end_time = ${endTime},
      is_active = ${isActive},
      updated_at = NOW()
    WHERE id = ${id}
      AND instructor_id = ${instructorId}
    RETURNING 
      id,
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    `;

  if (result.length === 0) {
    throw new Error(`Instructor availability not found: ${id}`);
  }

  return result[0];
}

/**
 * Deactivates an instructor availability window.
 * 
 * @param id - Availability ID
 * @param instructorId - Instructor ID
 */
export async function deactivateInstructorAvailability(
  id: string,
  instructorId: string
): Promise<void> {
  await sql`
    UPDATE instructor_availability
    SET is_active = false,
        updated_at = NOW()
    WHERE id = ${id}
      AND instructor_id = ${instructorId}
  `;
}

/**
 * Finds an availability row by instructor and slot (day + start + end).
 * Used for upsert: same day + start + end → update is_active.
 *
 * @param instructorId - Instructor ID
 * @param dayOfWeek - 0–6
 * @param startTime - e.g. "09:00"
 * @param endTime - e.g. "13:00"
 * @returns Single row or null
 */
export async function findInstructorAvailabilityBySlot(
  instructorId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<InstructorAvailability | null> {
  const result = await sql<InstructorAvailability[]>`
    SELECT
      id,
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
    FROM instructor_availability
    WHERE instructor_id = ${instructorId}
      AND day_of_week = ${dayOfWeek}
      AND start_time = ${startTime}
      AND end_time = ${endTime}
    LIMIT 1
  `;
  return result.length === 0 ? null : result[0];
}

/**
 * Toggles is_active for an availability row (inverts current value).
 * Scoped by instructor_id.
 *
 * @param id - Availability ID
 * @param instructorId - Instructor ID
 * @returns Updated row
 */
export async function toggleInstructorAvailability(
  id: string,
  instructorId: string
): Promise<InstructorAvailability> {
  const result = await sql<InstructorAvailability[]>`
    UPDATE instructor_availability
    SET is_active = NOT is_active,
        updated_at = NOW()
    WHERE id = ${id}
      AND instructor_id = ${instructorId}
    RETURNING
      id,
      instructor_id,
      day_of_week,
      start_time,
      end_time,
      is_active,
      created_at,
      updated_at
  `;
  if (result.length === 0) {
    throw new InstructorAvailabilityNotFoundError(id);
  }
  return result[0];
}

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
 * Lists all instructor availability windows (active and inactive).
 * 
 * @param instructorId - Instructor ID
 * @returns Array of instructor availability windows
 */
export async function listInstructorAvailability(
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

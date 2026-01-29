import { sql } from './client.js';

export interface InstructorMeetingPoint {
  id: string;
  instructor_id: string;
  name: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  what3words: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface CreateInstructorMeetingPointParams {
  instructorId: string;
  name: string;
  description: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  what3words?: string | null;
  is_default: boolean;
}

export interface UpdateInstructorMeetingPointParams {
  meetingPointId: string;
  instructorId: string;
  name: string;
  description: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  what3words?: string | null;
  is_default: boolean;
  is_active: boolean;
}

/**
 * Lists all instructor meeting points (active and inactive).
 * 
 * @param instructorId - Instructor ID
 * @returns Array of instructor meeting points
 */
export async function listInstructorMeetingPoints(
  instructorId: string
): Promise<InstructorMeetingPoint[]> {
  const result = await sql<InstructorMeetingPoint[]>`
    SELECT 
      id,
      instructor_id,
      name,
      description,
      address,
      latitude,
      longitude,
      what3words,
      is_default,
      is_active
    FROM instructor_meeting_points
    WHERE instructor_id = ${instructorId}
    ORDER BY created_at DESC
  `;

  return result;
}

/**
 * Creates a new instructor meeting point.
 * If is_default is true, unsets other defaults for the same instructor.
 * 
 * @param params - Create parameters
 * @returns Created instructor meeting point
 */
export async function createInstructorMeetingPoint(
  params: CreateInstructorMeetingPointParams
): Promise<InstructorMeetingPoint> {
  const { instructorId, name, description, address, latitude, longitude, what3words, is_default } = params;

  // If setting as default, unset other defaults for this instructor
  if (is_default) {
    await sql`
      UPDATE instructor_meeting_points
      SET is_default = false
      WHERE instructor_id = ${instructorId}
        AND is_default = true
    `;
  }

  const result = await sql<InstructorMeetingPoint[]>`
    INSERT INTO instructor_meeting_points (
      instructor_id,
      name,
      description,
      address,
      latitude,
      longitude,
      what3words,
      is_default,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${name},
      ${description},
      ${address ?? null},
      ${latitude ?? null},
      ${longitude ?? null},
      ${what3words ?? null},
      ${is_default},
      true,
      NOW(),
      NOW()
    )
    RETURNING 
      id,
      instructor_id,
      name,
      description,
      address,
      latitude,
      longitude,
      what3words,
      is_default,
      is_active
  `;

  if (result.length === 0) {
    throw new Error('Failed to create instructor meeting point');
  }

  return result[0];
}

/**
 * Updates an instructor meeting point.
 * If is_default is true, unsets other defaults for the same instructor.
 * 
 * @param params - Update parameters
 * @returns Updated instructor meeting point
 */
export async function updateInstructorMeetingPoint(
  params: UpdateInstructorMeetingPointParams
): Promise<InstructorMeetingPoint> {
  const { meetingPointId, instructorId, name, description, address, latitude, longitude, what3words, is_default, is_active } = params;

  // If setting as default, unset other defaults for this instructor (excluding current one)
  if (is_default) {
    await sql`
      UPDATE instructor_meeting_points
      SET is_default = false
      WHERE instructor_id = ${instructorId}
        AND is_default = true
        AND id != ${meetingPointId}
    `;
  }

  const result = await sql<InstructorMeetingPoint[]>`
    UPDATE instructor_meeting_points
    SET 
      name = ${name},
      description = ${description},
      address = ${address ?? null},
      latitude = ${latitude ?? null},
      longitude = ${longitude ?? null},
      what3words = ${what3words ?? null},
      is_default = ${is_default},
      is_active = ${is_active},
      updated_at = NOW()
    WHERE id = ${meetingPointId}
      AND instructor_id = ${instructorId}
    RETURNING 
      id,
      instructor_id,
      name,
      description,
      address,
      latitude,
      longitude,
      what3words,
      is_default,
      is_active
  `;

  if (result.length === 0) {
    throw new Error(`Instructor meeting point not found: ${meetingPointId}`);
  }

  return result[0];
}

import { sql } from './client.js';

export interface InstructorCalendarConnection {
  id: string;
  instructor_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  calendar_id: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertInstructorCalendarConnectionParams {
  instructorId: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  calendar_id: string;
  expires_at: string | null;
}

/**
 * Gets the calendar connection for an instructor.
 * Only one connection per instructor is allowed.
 * 
 * @param instructorId - Instructor ID
 * @returns Calendar connection or null if not found
 */
export async function getInstructorCalendarConnection(
  instructorId: string
): Promise<InstructorCalendarConnection | null> {
  const result = await sql<InstructorCalendarConnection[]>`
    SELECT 
      id,
      instructor_id,
      provider,
      access_token,
      refresh_token,
      calendar_id,
      expires_at,
      created_at,
      updated_at
    FROM instructor_calendar_connections
    WHERE instructor_id = ${instructorId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * Upserts (insert or update) a calendar connection for an instructor.
 * Only one connection per instructor is allowed (overwrites existing).
 * 
 * @param params - Connection parameters
 * @returns Upserted calendar connection
 */
export async function upsertInstructorCalendarConnection(
  params: UpsertInstructorCalendarConnectionParams
): Promise<InstructorCalendarConnection> {
  const { instructorId, provider, access_token, refresh_token, calendar_id, expires_at } = params;

  // Delete existing connection if any (to enforce one per instructor)
  await sql`
    DELETE FROM instructor_calendar_connections
    WHERE instructor_id = ${instructorId}
  `;

  // Insert new connection
  const result = await sql<InstructorCalendarConnection[]>`
    INSERT INTO instructor_calendar_connections (
      instructor_id,
      provider,
      access_token,
      refresh_token,
      calendar_id,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${provider},
      ${access_token},
      ${refresh_token ?? null},
      ${calendar_id},
      ${expires_at ?? null},
      NOW(),
      NOW()
    )
    RETURNING 
      id,
      instructor_id,
      provider,
      access_token,
      refresh_token,
      calendar_id,
      expires_at,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new Error('Failed to create instructor calendar connection');
  }

  return result[0];
}

/**
 * Deletes the calendar connection for an instructor.
 * 
 * @param instructorId - Instructor ID
 */
export async function deleteInstructorCalendarConnection(
  instructorId: string
): Promise<void> {
  await sql`
    DELETE FROM instructor_calendar_connections
    WHERE instructor_id = ${instructorId}
  `;
}

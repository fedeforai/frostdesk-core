import { sql } from './client.js';

export interface InstructorProfile {
  id: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

export interface UpdateInstructorProfileParams {
  instructorId: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

/**
 * Retrieves instructor profile by ID.
 * 
 * @param instructorId - Instructor ID
 * @returns Instructor profile or null if not found
 */
export async function getInstructorProfile(
  instructorId: string
): Promise<InstructorProfile | null> {
  const result = await sql<InstructorProfile[]>`
    SELECT 
      id,
      full_name,
      base_resort,
      working_language,
      contact_email
    FROM instructor_profiles
    WHERE id = ${instructorId}
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * Updates instructor profile.
 * 
 * @param params - Update parameters
 * @returns Updated instructor profile
 */
export async function updateInstructorProfile(
  params: UpdateInstructorProfileParams
): Promise<InstructorProfile> {
  const { instructorId, full_name, base_resort, working_language, contact_email } = params;

  const result = await sql<InstructorProfile[]>`
    UPDATE instructor_profiles
    SET 
      full_name = ${full_name},
      base_resort = ${base_resort},
      working_language = ${working_language},
      contact_email = ${contact_email},
      updated_at = NOW()
    WHERE id = ${instructorId}
    RETURNING 
      id,
      full_name,
      base_resort,
      working_language,
      contact_email
  `;

  if (result.length === 0) {
    throw new Error(`Instructor profile not found: ${instructorId}`);
  }

  return result[0];
}

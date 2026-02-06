import { sql } from './client.js';

export interface InstructorProfile {
  id: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
  onboarding_completed_at?: string | null;
}

export interface UpdateInstructorProfileParams {
  instructorId: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

export interface CreateInstructorProfileParams {
  id: string;
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

export interface UpdateInstructorProfileByUserIdParams {
  userId: string;
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
  const result = await sql<(InstructorProfile & { onboarding_completed_at: string | null })[]>`
    SELECT 
      id,
      full_name,
      base_resort,
      working_language,
      contact_email,
      onboarding_completed_at
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

/**
 * Retrieves instructor profile by auth user ID (instructor_profiles.id = userId).
 */
export async function getInstructorProfileByUserId(
  userId: string
): Promise<InstructorProfile | null> {
  return getInstructorProfile(userId);
}

/**
 * Creates an instructor profile. Minimal insert for export alignment.
 */
export async function createInstructorProfile(
  params: CreateInstructorProfileParams
): Promise<InstructorProfile> {
  const { id, full_name, base_resort, working_language, contact_email } = params;
  const result = await sql<InstructorProfile[]>`
    INSERT INTO instructor_profiles (id, full_name, base_resort, working_language, contact_email)
    VALUES (${id}::uuid, ${full_name}, ${base_resort}, ${working_language}, ${contact_email})
    RETURNING id, full_name, base_resort, working_language, contact_email
  `;
  if (result.length === 0) throw new Error('Insert failed');
  return result[0];
}

/**
 * Updates instructor profile by auth user ID (instructor_profiles.id = userId).
 */
export async function updateInstructorProfileByUserId(
  params: UpdateInstructorProfileByUserIdParams
): Promise<InstructorProfile> {
  return updateInstructorProfile({
    instructorId: params.userId,
    full_name: params.full_name,
    base_resort: params.base_resort,
    working_language: params.working_language,
    contact_email: params.contact_email,
  });
}

/**
 * Marks onboarding as completed for the given instructor.
 */
export async function completeInstructorOnboarding(instructorId: string): Promise<void> {
  await sql`
    UPDATE instructor_profiles
    SET onboarding_completed_at = NOW(), updated_at = NOW()
    WHERE id = ${instructorId}::uuid
  `;
}

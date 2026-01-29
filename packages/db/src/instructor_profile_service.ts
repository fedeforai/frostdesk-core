import {
  getInstructorProfile,
  updateInstructorProfile,
  type InstructorProfile,
  type UpdateInstructorProfileParams,
} from './instructor_profile_repository.js';

export interface UpdateInstructorProfileServiceParams {
  full_name: string;
  base_resort: string;
  working_language: string;
  contact_email: string;
}

/**
 * Retrieves instructor profile.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @returns Instructor profile or null if not found
 */
export async function getInstructorProfileService(
  userId: string
): Promise<InstructorProfile | null> {
  return getInstructorProfile(userId);
}

/**
 * Updates instructor profile.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param data - Profile data to update
 * @returns Updated instructor profile
 */
export async function updateInstructorProfileService(
  userId: string,
  data: UpdateInstructorProfileServiceParams
): Promise<InstructorProfile> {
  return updateInstructorProfile({
    instructorId: userId,
    full_name: data.full_name,
    base_resort: data.base_resort,
    working_language: data.working_language,
    contact_email: data.contact_email,
  });
}

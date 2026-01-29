import {
  listInstructorAvailability,
  createInstructorAvailability,
  updateInstructorAvailability,
  deactivateInstructorAvailability,
  type InstructorAvailability,
  type CreateInstructorAvailabilityParams,
  type UpdateInstructorAvailabilityParams,
} from './instructor_availability_repository.js';

/**
 * Lists instructor availability windows.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @returns Array of instructor availability windows
 */
export async function getInstructorAvailabilityService(
  userId: string
): Promise<InstructorAvailability[]> {
  return listInstructorAvailability(userId);
}

/**
 * Creates a new instructor availability window.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param payload - Availability data (dayOfWeek, startTime, endTime, isActive)
 * @returns Created instructor availability window
 */
export async function createInstructorAvailabilityService(
  userId: string,
  payload: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }
): Promise<InstructorAvailability> {
  const params: CreateInstructorAvailabilityParams = {
    instructorId: userId,
    dayOfWeek: payload.dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    isActive: payload.isActive,
  };

  return createInstructorAvailability(params);
}

/**
 * Updates an instructor availability window.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param payload - Availability data (id, dayOfWeek, startTime, endTime, isActive)
 * @returns Updated instructor availability window
 */
export async function updateInstructorAvailabilityService(
  userId: string,
  payload: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }
): Promise<InstructorAvailability> {
  const params: UpdateInstructorAvailabilityParams = {
    id: payload.id,
    instructorId: userId,
    dayOfWeek: payload.dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    isActive: payload.isActive,
  };

  return updateInstructorAvailability(params);
}

/**
 * Deactivates an instructor availability window.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param availabilityId - Availability ID
 */
export async function deactivateInstructorAvailabilityService(
  userId: string,
  availabilityId: string
): Promise<void> {
  await deactivateInstructorAvailability(availabilityId, userId);
}

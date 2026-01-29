import {
  listInstructorMeetingPoints,
  createInstructorMeetingPoint,
  updateInstructorMeetingPoint,
  type InstructorMeetingPoint,
  type CreateInstructorMeetingPointParams,
  type UpdateInstructorMeetingPointParams,
} from './instructor_meeting_points_repository.js';

export interface CreateInstructorMeetingPointServiceParams {
  name: string;
  description: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  what3words?: string | null;
  is_default: boolean;
}

export interface UpdateInstructorMeetingPointServiceParams {
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
 * Lists instructor meeting points.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @returns Array of instructor meeting points
 */
export async function getInstructorMeetingPointsService(
  userId: string
): Promise<InstructorMeetingPoint[]> {
  return listInstructorMeetingPoints(userId);
}

/**
 * Creates a new instructor meeting point.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param data - Meeting point data
 * @returns Created instructor meeting point
 */
export async function createInstructorMeetingPointService(
  userId: string,
  data: CreateInstructorMeetingPointServiceParams
): Promise<InstructorMeetingPoint> {
  return createInstructorMeetingPoint({
    instructorId: userId,
    name: data.name,
    description: data.description,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    what3words: data.what3words,
    is_default: data.is_default,
  });
}

/**
 * Updates an instructor meeting point.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param meetingPointId - Meeting point ID
 * @param data - Meeting point data to update
 * @returns Updated instructor meeting point
 */
export async function updateInstructorMeetingPointService(
  userId: string,
  meetingPointId: string,
  data: UpdateInstructorMeetingPointServiceParams
): Promise<InstructorMeetingPoint> {
  return updateInstructorMeetingPoint({
    meetingPointId,
    instructorId: userId,
    name: data.name,
    description: data.description,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    what3words: data.what3words,
    is_default: data.is_default,
    is_active: data.is_active,
  });
}

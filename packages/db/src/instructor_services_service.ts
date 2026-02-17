import {
  listInstructorServices,
  createInstructorService,
  updateInstructorService,
  type InstructorService,
  type CreateInstructorServiceParams,
  type UpdateInstructorServiceParams,
  type LessonType,
} from './instructor_services_repository.js';

export type { LessonType };

export interface CreateInstructorServiceServiceParams {
  name?: string | null;
  discipline: string;
  lesson_type?: LessonType | null;
  duration_minutes: number;
  min_participants?: number;
  max_participants?: number;
  price_amount: number;
  currency: string;
  short_description?: string | null;
  location?: string | null;
  notes?: string | null;
  sort_order?: number;
}

export interface UpdateInstructorServiceServiceParams {
  name: string | null;
  discipline: string;
  lesson_type: LessonType | null;
  duration_minutes: number;
  min_participants: number;
  max_participants: number;
  price_amount: number;
  currency: string;
  short_description: string | null;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
}

/**
 * Lists instructor services.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @returns Array of instructor services
 */
export async function getInstructorServicesService(
  userId: string
): Promise<InstructorService[]> {
  return listInstructorServices(userId);
}

/**
 * Creates a new instructor service.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param data - Service data
 * @returns Created instructor service
 */
export async function createInstructorServiceService(
  userId: string,
  data: CreateInstructorServiceServiceParams
): Promise<InstructorService> {
  return createInstructorService({
    instructorId: userId,
    name: data.name,
    discipline: data.discipline,
    lesson_type: data.lesson_type,
    duration_minutes: data.duration_minutes,
    min_participants: data.min_participants,
    max_participants: data.max_participants,
    price_amount: data.price_amount,
    currency: data.currency,
    short_description: data.short_description,
    location: data.location,
    notes: data.notes,
    sort_order: data.sort_order,
  });
}

/**
 * Updates an instructor service.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param serviceId - Service ID
 * @param data - Service data to update
 * @returns Updated instructor service
 */
export async function updateInstructorServiceService(
  userId: string,
  serviceId: string,
  data: UpdateInstructorServiceServiceParams
): Promise<InstructorService> {
  return updateInstructorService({
    serviceId,
    instructorId: userId,
    name: data.name,
    discipline: data.discipline,
    lesson_type: data.lesson_type,
    duration_minutes: data.duration_minutes,
    min_participants: data.min_participants,
    max_participants: data.max_participants,
    price_amount: data.price_amount,
    currency: data.currency,
    short_description: data.short_description,
    location: data.location,
    notes: data.notes,
    is_active: data.is_active,
    sort_order: data.sort_order,
  });
}

import {
  listInstructorServices,
  createInstructorService,
  updateInstructorService,
  type InstructorService,
  type CreateInstructorServiceParams,
  type UpdateInstructorServiceParams,
} from './instructor_services_repository.js';

export interface CreateInstructorServiceServiceParams {
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  notes?: string | null;
}

export interface UpdateInstructorServiceServiceParams {
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  notes?: string | null;
  is_active: boolean;
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
    discipline: data.discipline,
    duration_minutes: data.duration_minutes,
    price_amount: data.price_amount,
    currency: data.currency,
    notes: data.notes,
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
    discipline: data.discipline,
    duration_minutes: data.duration_minutes,
    price_amount: data.price_amount,
    currency: data.currency,
    notes: data.notes,
    is_active: data.is_active,
  });
}

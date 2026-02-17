import { sql } from './client.js';

export type LessonType = 'private' | 'semi_private' | 'group';

export interface InstructorService {
  id: string;
  instructor_id: string;
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
  is_active: boolean;
  notes: string | null;
  sort_order: number;
}

export interface CreateInstructorServiceParams {
  instructorId: string;
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

export interface UpdateInstructorServiceParams {
  serviceId: string;
  instructorId: string;
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
 * Gets all instructor services (active and inactive) for an instructor.
 *
 * @param instructorId - Instructor ID
 * @returns Array of instructor services
 */
export async function getInstructorServices(
  instructorId: string
): Promise<InstructorService[]> {
  const result = await sql<InstructorService[]>`
    SELECT
      id,
      instructor_id,
      name,
      discipline,
      lesson_type,
      duration_minutes,
      COALESCE(min_participants, 1) AS min_participants,
      COALESCE(max_participants, 1) AS max_participants,
      price_amount,
      currency,
      short_description,
      location,
      is_active,
      notes,
      COALESCE(sort_order, 0) AS sort_order
    FROM instructor_services
    WHERE instructor_id = ${instructorId}
    ORDER BY COALESCE(sort_order, 0) ASC, created_at ASC
  `;
  return result;
}

/**
 * Lists all instructor services (active and inactive).
 * Alias for getInstructorServices for backward compatibility.
 */
export async function listInstructorServices(
  instructorId: string
): Promise<InstructorService[]> {
  return getInstructorServices(instructorId);
}

/**
 * Creates a new instructor service.
 * 
 * @param params - Create parameters
 * @returns Created instructor service
 */
export async function createInstructorService(
  params: CreateInstructorServiceParams
): Promise<InstructorService> {
  const {
    instructorId,
    name: nameParam,
    discipline,
    lesson_type = 'private',
    duration_minutes,
    min_participants = 1,
    max_participants = 1,
    price_amount,
    currency,
    short_description,
    location,
    notes,
    sort_order = 0,
  } = params;
  const name = nameParam != null && nameParam.trim() !== '' ? nameParam.trim() : discipline;

  const result = await sql<InstructorService[]>`
    INSERT INTO instructor_services (
      instructor_id,
      name,
      discipline,
      lesson_type,
      duration_minutes,
      min_participants,
      max_participants,
      price_amount,
      currency,
      short_description,
      location,
      notes,
      is_active,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${name},
      ${discipline},
      ${lesson_type},
      ${duration_minutes},
      ${min_participants},
      ${max_participants},
      ${price_amount},
      ${currency},
      ${short_description ?? null},
      ${location ?? null},
      ${notes ?? null},
      true,
      ${sort_order},
      NOW(),
      NOW()
    )
    RETURNING 
      id,
      instructor_id,
      name,
      discipline,
      lesson_type,
      duration_minutes,
      min_participants,
      max_participants,
      price_amount,
      currency,
      short_description,
      location,
      is_active,
      notes,
      sort_order
  `;

  if (result.length === 0) {
    throw new Error('Failed to create instructor service');
  }

  return result[0];
}

/**
 * Updates an instructor service.
 * 
 * @param params - Update parameters
 * @returns Updated instructor service
 */
export async function updateInstructorService(
  params: UpdateInstructorServiceParams
): Promise<InstructorService> {
  const {
    serviceId,
    instructorId,
    name,
    discipline,
    lesson_type,
    duration_minutes,
    min_participants,
    max_participants,
    price_amount,
    currency,
    short_description,
    location,
    notes,
    is_active,
    sort_order,
  } = params;

  const result = await sql<InstructorService[]>`
    UPDATE instructor_services
    SET 
      name = ${name},
      discipline = ${discipline},
      lesson_type = ${lesson_type},
      duration_minutes = ${duration_minutes},
      min_participants = ${min_participants},
      max_participants = ${max_participants},
      price_amount = ${price_amount},
      currency = ${currency},
      short_description = ${short_description},
      location = ${location},
      notes = ${notes},
      is_active = ${is_active},
      sort_order = ${sort_order},
      updated_at = NOW()
    WHERE id = ${serviceId}
      AND instructor_id = ${instructorId}
    RETURNING 
      id,
      instructor_id,
      name,
      discipline,
      lesson_type,
      duration_minutes,
      min_participants,
      max_participants,
      price_amount,
      currency,
      short_description,
      location,
      is_active,
      notes,
      sort_order
  `;

  if (result.length === 0) {
    throw new Error(`Instructor service not found: ${serviceId}`);
  }

  return result[0];
}

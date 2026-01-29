import { sql } from './client.js';

export interface InstructorService {
  id: string;
  instructor_id: string;
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  is_active: boolean;
  notes: string | null;
}

export interface CreateInstructorServiceParams {
  instructorId: string;
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  notes?: string | null;
}

export interface UpdateInstructorServiceParams {
  serviceId: string;
  instructorId: string;
  discipline: string;
  duration_minutes: number;
  price_amount: number;
  currency: string;
  notes?: string | null;
  is_active: boolean;
}

/**
 * Lists all instructor services (active and inactive).
 * 
 * @param instructorId - Instructor ID
 * @returns Array of instructor services
 */
export async function listInstructorServices(
  instructorId: string
): Promise<InstructorService[]> {
  const result = await sql<InstructorService[]>`
    SELECT 
      id,
      instructor_id,
      discipline,
      duration_minutes,
      price_amount,
      currency,
      is_active,
      notes
    FROM instructor_services
    WHERE instructor_id = ${instructorId}
    ORDER BY created_at DESC
  `;

  return result;
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
  const { instructorId, discipline, duration_minutes, price_amount, currency, notes } = params;

  const result = await sql<InstructorService[]>`
    INSERT INTO instructor_services (
      instructor_id,
      discipline,
      duration_minutes,
      price_amount,
      currency,
      notes,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${discipline},
      ${duration_minutes},
      ${price_amount},
      ${currency},
      ${notes ?? null},
      true,
      NOW(),
      NOW()
    )
    RETURNING 
      id,
      instructor_id,
      discipline,
      duration_minutes,
      price_amount,
      currency,
      is_active,
      notes
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
  const { serviceId, instructorId, discipline, duration_minutes, price_amount, currency, notes, is_active } = params;

  const result = await sql<InstructorService[]>`
    UPDATE instructor_services
    SET 
      discipline = ${discipline},
      duration_minutes = ${duration_minutes},
      price_amount = ${price_amount},
      currency = ${currency},
      notes = ${notes ?? null},
      is_active = ${is_active},
      updated_at = NOW()
    WHERE id = ${serviceId}
      AND instructor_id = ${instructorId}
    RETURNING 
      id,
      instructor_id,
      discipline,
      duration_minutes,
      price_amount,
      currency,
      is_active,
      notes
  `;

  if (result.length === 0) {
    throw new Error(`Instructor service not found: ${serviceId}`);
  }

  return result[0];
}

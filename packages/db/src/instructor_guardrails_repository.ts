import { sql } from './client.js';

export interface InstructorGuardrails {
  instructor_id: string;
  allow_discounts: boolean;
  allow_off_availability: boolean;
  require_manual_review: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_GUARDRAILS = {
  allow_discounts: false,
  allow_off_availability: false,
  require_manual_review: true,
} as const;

/**
 * Gets instructor guardrails. If no row exists for the instructor, inserts default
 * (allow_discounts=false, allow_off_availability=false, require_manual_review=true) and returns it.
 *
 * @param instructorId - Instructor ID (instructor_profiles.id)
 * @returns Guardrails row
 */
export async function getInstructorGuardrails(
  instructorId: string
): Promise<InstructorGuardrails> {
  const existing = await sql<InstructorGuardrails[]>`
    SELECT
      instructor_id,
      allow_discounts,
      allow_off_availability,
      require_manual_review,
      created_at,
      updated_at
    FROM instructor_guardrails
    WHERE instructor_id = ${instructorId}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0];
  }

  const inserted = await sql<InstructorGuardrails[]>`
    INSERT INTO instructor_guardrails (
      instructor_id,
      allow_discounts,
      allow_off_availability,
      require_manual_review,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${DEFAULT_GUARDRAILS.allow_discounts},
      ${DEFAULT_GUARDRAILS.allow_off_availability},
      ${DEFAULT_GUARDRAILS.require_manual_review},
      NOW(),
      NOW()
    )
    RETURNING
      instructor_id,
      allow_discounts,
      allow_off_availability,
      require_manual_review,
      created_at,
      updated_at
  `;

  return inserted[0];
}

export type UpdateInstructorGuardrailsPatch = {
  allow_discounts?: boolean;
  allow_off_availability?: boolean;
  require_manual_review?: boolean;
};

/**
 * Updates instructor guardrails. Only provided patch fields are applied.
 * Row must exist (call getInstructorGuardrails first if needed).
 *
 * @param instructorId - Instructor ID
 * @param patch - At least one of allow_discounts, allow_off_availability, require_manual_review
 * @returns Updated guardrails row
 */
export async function updateInstructorGuardrails(
  instructorId: string,
  patch: UpdateInstructorGuardrailsPatch
): Promise<InstructorGuardrails> {
  const hasKey =
    patch.allow_discounts !== undefined ||
    patch.allow_off_availability !== undefined ||
    patch.require_manual_review !== undefined;
  if (!hasKey) {
    throw new Error('INVALID_PATCH');
  }

  const current = await getInstructorGuardrails(instructorId);
  const allow_discounts = patch.allow_discounts ?? current.allow_discounts;
  const allow_off_availability = patch.allow_off_availability ?? current.allow_off_availability;
  const require_manual_review = patch.require_manual_review ?? current.require_manual_review;

  const result = await sql<InstructorGuardrails[]>`
    UPDATE instructor_guardrails
    SET
      allow_discounts = ${allow_discounts},
      allow_off_availability = ${allow_off_availability},
      require_manual_review = ${require_manual_review},
      updated_at = NOW()
    WHERE instructor_id = ${instructorId}
    RETURNING
      instructor_id,
      allow_discounts,
      allow_off_availability,
      require_manual_review,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new Error('GUARDRAILS_NOT_FOUND');
  }

  return result[0];
}

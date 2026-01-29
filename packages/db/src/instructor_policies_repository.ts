import { sql } from './client.js';

export type PolicyType = 
  | 'cancellation'
  | 'no_show'
  | 'weather'
  | 'payment'
  | 'liability'
  | 'meeting_point'
  | 'substitution'
  | 'group_private'
  | 'escalation';

export interface InstructorPolicy {
  id: string;
  instructor_id: string;
  policy_type: PolicyType;
  title: string;
  content: string;
  version: number;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInstructorPolicyParams {
  instructorId: string;
  policy_type: PolicyType;
  title: string;
  content: string;
  version: number;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active: boolean;
}

export interface UpdateInstructorPolicyParams {
  policyId: string;
  instructorId: string;
  policy_type: PolicyType;
  title: string;
  content: string;
  version: number;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active: boolean;
}

/**
 * Lists all instructor policies (active and inactive).
 * 
 * @param instructorId - Instructor ID
 * @returns Array of instructor policies
 */
export async function listInstructorPolicies(
  instructorId: string
): Promise<InstructorPolicy[]> {
  const result = await sql<InstructorPolicy[]>`
    SELECT 
      id,
      instructor_id,
      policy_type,
      title,
      content,
      version,
      is_active,
      valid_from,
      valid_to,
      created_at,
      updated_at
    FROM instructor_policies
    WHERE instructor_id = ${instructorId}
    ORDER BY policy_type, version DESC
  `;

  return result;
}

/**
 * Gets the active instructor policy by type.
 * 
 * @param instructorId - Instructor ID
 * @param policyType - Policy type
 * @returns Active instructor policy or null if not found
 */
export async function getInstructorPolicyByType(
  instructorId: string,
  policyType: PolicyType
): Promise<InstructorPolicy | null> {
  const result = await sql<InstructorPolicy[]>`
    SELECT 
      id,
      instructor_id,
      policy_type,
      title,
      content,
      version,
      is_active,
      valid_from,
      valid_to,
      created_at,
      updated_at
    FROM instructor_policies
    WHERE instructor_id = ${instructorId}
      AND policy_type = ${policyType}
      AND is_active = true
    ORDER BY version DESC
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * Deactivates other policies of the same type for an instructor.
 * 
 * @param instructorId - Instructor ID
 * @param policyType - Policy type
 */
export async function deactivateOtherPolicies(
  instructorId: string,
  policyType: PolicyType
): Promise<void> {
  await sql`
    UPDATE instructor_policies
    SET is_active = false
    WHERE instructor_id = ${instructorId}
      AND policy_type = ${policyType}
      AND is_active = true
  `;
}

/**
 * Creates a new instructor policy.
 * If is_active is true, deactivates other policies of the same type for this instructor.
 * 
 * @param params - Create parameters
 * @returns Created instructor policy
 */
export async function createInstructorPolicy(
  params: CreateInstructorPolicyParams
): Promise<InstructorPolicy> {
  const { instructorId, policy_type, title, content, version, valid_from, valid_to, is_active } = params;

  // If setting as active, deactivate other policies of the same type for this instructor
  if (is_active) {
    await deactivateOtherPolicies(instructorId, policy_type);
  }

  const result = await sql<InstructorPolicy[]>`
    INSERT INTO instructor_policies (
      instructor_id,
      policy_type,
      title,
      content,
      version,
      is_active,
      valid_from,
      valid_to,
      created_at,
      updated_at
    )
    VALUES (
      ${instructorId},
      ${policy_type},
      ${title},
      ${content},
      ${version},
      ${is_active},
      ${valid_from ?? null},
      ${valid_to ?? null},
      NOW(),
      NOW()
    )
    RETURNING 
      id,
      instructor_id,
      policy_type,
      title,
      content,
      version,
      is_active,
      valid_from,
      valid_to,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new Error('Failed to create instructor policy');
  }

  return result[0];
}

/**
 * Updates an instructor policy.
 * If is_active is true, deactivates other policies of the same type for this instructor.
 * 
 * @param params - Update parameters
 * @returns Updated instructor policy
 */
export async function updateInstructorPolicy(
  params: UpdateInstructorPolicyParams
): Promise<InstructorPolicy> {
  const { policyId, instructorId, policy_type, title, content, version, valid_from, valid_to, is_active } = params;

  // If setting as active, deactivate other policies of the same type for this instructor (excluding current one)
  if (is_active) {
    await sql`
      UPDATE instructor_policies
      SET is_active = false
      WHERE instructor_id = ${instructorId}
        AND policy_type = ${policy_type}
        AND is_active = true
        AND id != ${policyId}
    `;
  }

  const result = await sql<InstructorPolicy[]>`
    UPDATE instructor_policies
    SET 
      policy_type = ${policy_type},
      title = ${title},
      content = ${content},
      version = ${version},
      is_active = ${is_active},
      valid_from = ${valid_from ?? null},
      valid_to = ${valid_to ?? null},
      updated_at = NOW()
    WHERE id = ${policyId}
      AND instructor_id = ${instructorId}
    RETURNING 
      id,
      instructor_id,
      policy_type,
      title,
      content,
      version,
      is_active,
      valid_from,
      valid_to,
      created_at,
      updated_at
  `;

  if (result.length === 0) {
    throw new Error(`Instructor policy not found: ${policyId}`);
  }

  return result[0];
}

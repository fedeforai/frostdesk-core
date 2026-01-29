import {
  listInstructorPolicies,
  createInstructorPolicy,
  updateInstructorPolicy,
  type InstructorPolicy,
  type PolicyType,
  type CreateInstructorPolicyParams,
  type UpdateInstructorPolicyParams,
} from './instructor_policies_repository.js';

export interface CreateInstructorPolicyServiceParams {
  policy_type: PolicyType;
  title: string;
  content: string;
  version: number;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active: boolean;
}

export interface UpdateInstructorPolicyServiceParams {
  policy_type: PolicyType;
  title: string;
  content: string;
  version: number;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active: boolean;
}

/**
 * Lists instructor policies.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @returns Array of instructor policies
 */
export async function listInstructorPoliciesService(
  userId: string
): Promise<InstructorPolicy[]> {
  return listInstructorPolicies(userId);
}

/**
 * Creates a new instructor policy.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param data - Policy data
 * @returns Created instructor policy
 */
export async function createInstructorPolicyService(
  userId: string,
  data: CreateInstructorPolicyServiceParams
): Promise<InstructorPolicy> {
  return createInstructorPolicy({
    instructorId: userId,
    policy_type: data.policy_type,
    title: data.title,
    content: data.content,
    version: data.version,
    valid_from: data.valid_from,
    valid_to: data.valid_to,
    is_active: data.is_active,
  });
}

/**
 * Updates an instructor policy.
 * 
 * @param userId - User ID (must equal instructor ID)
 * @param policyId - Policy ID
 * @param data - Policy data to update
 * @returns Updated instructor policy
 */
export async function updateInstructorPolicyService(
  userId: string,
  policyId: string,
  data: UpdateInstructorPolicyServiceParams
): Promise<InstructorPolicy> {
  return updateInstructorPolicy({
    policyId,
    instructorId: userId,
    policy_type: data.policy_type,
    title: data.title,
    content: data.content,
    version: data.version,
    valid_from: data.valid_from,
    valid_to: data.valid_to,
    is_active: data.is_active,
  });
}

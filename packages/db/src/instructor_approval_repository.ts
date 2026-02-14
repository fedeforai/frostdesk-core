import { sql } from './client.js';

export interface PendingInstructor {
  id: string;
  email: string | null;
  created_at: string;
}

/**
 * Lists instructors with approval_status = 'pending' for admin approval UI.
 * Uses instructor_profiles (id, user_id, full_name, created_at); no contact_email in reconciled schema.
 */
export async function listPendingInstructors(): Promise<PendingInstructor[]> {
  const rows = await sql<{ id: string; user_id: string | null; full_name: string | null; created_at: string }[]>`
    SELECT id, user_id, full_name, created_at
    FROM instructor_profiles
    WHERE approval_status = 'pending'
    ORDER BY created_at ASC
  `;
  return rows.map((r) => ({
    id: r.user_id ?? r.id,
    email: r.full_name ?? null,
    created_at: r.created_at,
  }));
}

export interface InstructorApprovalRow {
  id: string;
  email: string | null;
  approval_status: string;
  created_at: string;
}

/**
 * Sets approval_status for an instructor. Only 'approved' and 'rejected' are allowed.
 * instructorId can be user_id (auth user) or profile id. Returns the updated row or null if not found.
 */
export async function setInstructorApprovalStatus(
  instructorId: string,
  status: 'approved' | 'rejected'
): Promise<InstructorApprovalRow | null> {
  const result = await sql<{ id: string; full_name: string | null; approval_status: string; created_at: string }[]>`
    UPDATE instructor_profiles
    SET approval_status = ${status}
    WHERE id = ${instructorId}::uuid OR user_id = ${instructorId}::uuid
    RETURNING id, full_name, approval_status, created_at
  `;
  if (result.length === 0) return null;
  const r = result[0];
  return {
    id: r.id,
    email: r.full_name,
    approval_status: r.approval_status,
    created_at: r.created_at,
  };
}

import { sql } from './client.js';

export interface PendingInstructor {
  id: string;
  email: string | null;
  created_at: string;
}

/**
 * Lists instructors with approval_status = 'pending' for admin approval UI.
 */
export async function listPendingInstructors(): Promise<PendingInstructor[]> {
  const rows = await sql<PendingInstructor[]>`
    SELECT id, email, created_at
    FROM instructors
    WHERE approval_status = 'pending'
    ORDER BY created_at ASC
  `;
  return rows;
}

export interface InstructorApprovalRow {
  id: string;
  email: string | null;
  approval_status: string;
  created_at: string;
}

/**
 * Sets approval_status for an instructor. Only 'approved' and 'rejected' are allowed.
 * Returns the updated row or null if not found.
 */
export async function setInstructorApprovalStatus(
  instructorId: string,
  status: 'approved' | 'rejected'
): Promise<InstructorApprovalRow | null> {
  const result = await sql<InstructorApprovalRow[]>`
    UPDATE instructors
    SET approval_status = ${status}
    WHERE id = ${instructorId}
    RETURNING id, email, approval_status, created_at
  `;
  return result.length > 0 ? result[0] : null;
}

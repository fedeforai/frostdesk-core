/**
 * Loop 5: Instructor referrals (trusted peers). Configuration only.
 * Unidirectional: instructor_id -> referred_instructor_id.
 * No auto-assign, no AI.
 */

import { sql } from './client.js';

export interface InstructorReferralRow {
  id: string;
  instructor_id: string;
  referred_instructor_id: string;
  created_at: string;
  created_by: string | null;
}

export interface ReferralWithProfile {
  instructor_id: string;
  display_name: string;
  location: string | null;
}

/**
 * Lists referred instructors for the given instructor (trusted peers).
 * Returns display info from instructor_profiles when available.
 */
export async function listReferralsForInstructor(
  instructorId: string
): Promise<ReferralWithProfile[]> {
  const rows = await sql<Array<{
    referred_instructor_id: string;
    full_name: string | null;
    base_resort: string | null;
  }>>`
    SELECT r.referred_instructor_id, p.full_name, p.base_resort
    FROM instructor_referrals r
    LEFT JOIN instructor_profiles p ON p.id = r.referred_instructor_id
    WHERE r.instructor_id = ${instructorId}
    ORDER BY r.created_at ASC
  `;

  return rows.map((row) => ({
    instructor_id: row.referred_instructor_id,
    display_name: row.full_name ?? 'Instructor',
    location: row.base_resort ?? null,
  }));
}

/**
 * Returns true if to_instructor_id is in the referring instructor's referral list.
 */
export async function isReferredInstructor(
  instructorId: string,
  toInstructorId: string
): Promise<boolean> {
  const result = await sql<Array<{ id: string }>>`
    SELECT id
    FROM instructor_referrals
    WHERE instructor_id = ${instructorId}
      AND referred_instructor_id = ${toInstructorId}
    LIMIT 1
  `;
  return result.length > 0;
}

/**
 * Adds a referred instructor (trusted peer). Idempotent: unique on (instructor_id, referred_instructor_id).
 */
export async function addReferral(params: {
  instructorId: string;
  referredInstructorId: string;
  createdBy: string | null;
}): Promise<InstructorReferralRow> {
  const result = await sql<InstructorReferralRow[]>`
    INSERT INTO instructor_referrals (instructor_id, referred_instructor_id, created_by)
    VALUES (${params.instructorId}, ${params.referredInstructorId}, ${params.createdBy})
    ON CONFLICT (instructor_id, referred_instructor_id) DO UPDATE SET created_at = NOW()
    RETURNING id, instructor_id, referred_instructor_id, created_at, created_by
  `;
  if (result.length === 0) throw new Error('Failed to add referral');
  return result[0];
}

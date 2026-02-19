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
// ── Admin: list all instructor profiles with performance metrics ─────

export interface AdminInstructorRow {
  id: string;
  full_name: string | null;
  display_name: string | null;
  approval_status: string | null;
  profile_status: string | null;
  billing_status: string;
  account_health: string | null;
  created_at: string;
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  total_conversations: number;
}

export interface ListAllInstructorProfilesParams {
  limit: number;
  offset: number;
  approval_status?: string;
}

export interface ListAllInstructorProfilesResult {
  items: AdminInstructorRow[];
  total: number;
}

/**
 * Lists all instructor profiles with aggregated performance metrics.
 * Read-only, no mutations. Supports filtering by approval_status and offset pagination.
 */
export async function listAllInstructorProfiles(
  params: ListAllInstructorProfilesParams
): Promise<ListAllInstructorProfilesResult> {
  const { limit, offset, approval_status } = params;
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);

  let rows: Array<AdminInstructorRow & { _total: string }>;

  if (approval_status != null && approval_status !== '') {
    rows = await sql<Array<AdminInstructorRow & { _total: string }>>`
      SELECT
        ip.id,
        ip.full_name,
        COALESCE(ip.display_name, ip.full_name)::text AS display_name,
        ip.approval_status,
        COALESCE(ip.profile_status, 'draft')::text AS profile_status,
        COALESCE(ip.billing_status, 'pilot')::text AS billing_status,
        ip.account_health,
        ip.created_at,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.instructor_id = ip.id), 0)::int AS total_bookings,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.instructor_id = ip.id AND b.status = 'confirmed'), 0)::int AS confirmed_bookings,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.instructor_id = ip.id AND b.status = 'cancelled'), 0)::int AS cancelled_bookings,
        COALESCE((SELECT COUNT(*) FROM conversations c WHERE c.instructor_id = ip.id), 0)::int AS total_conversations,
        COUNT(*) OVER()::text AS _total
      FROM instructor_profiles ip
      WHERE ip.approval_status = ${approval_status}
      ORDER BY ip.created_at DESC
      LIMIT ${safeLimit}
      OFFSET ${safeOffset}
    `;
  } else {
    rows = await sql<Array<AdminInstructorRow & { _total: string }>>`
      SELECT
        ip.id,
        ip.full_name,
        COALESCE(ip.display_name, ip.full_name)::text AS display_name,
        ip.approval_status,
        COALESCE(ip.profile_status, 'draft')::text AS profile_status,
        COALESCE(ip.billing_status, 'pilot')::text AS billing_status,
        ip.account_health,
        ip.created_at,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.instructor_id = ip.id), 0)::int AS total_bookings,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.instructor_id = ip.id AND b.status = 'confirmed'), 0)::int AS confirmed_bookings,
        COALESCE((SELECT COUNT(*) FROM bookings b WHERE b.instructor_id = ip.id AND b.status = 'cancelled'), 0)::int AS cancelled_bookings,
        COALESCE((SELECT COUNT(*) FROM conversations c WHERE c.instructor_id = ip.id), 0)::int AS total_conversations,
        COUNT(*) OVER()::text AS _total
      FROM instructor_profiles ip
      ORDER BY ip.created_at DESC
      LIMIT ${safeLimit}
      OFFSET ${safeOffset}
    `;
  }

  const total = rows.length > 0 ? Number(rows[0]._total) : 0;
  const items: AdminInstructorRow[] = rows.map(({ _total, ...rest }) => rest);

  return { items, total };
}

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

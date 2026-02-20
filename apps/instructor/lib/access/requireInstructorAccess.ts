/**
 * requireInstructorAccess — server-side helper
 *
 * Returns a typed object with session, instructor row, and a gate enum.
 * NEVER throws. NEVER redirects. Callers decide what to do with the gate.
 *
 * Usage in a Server Component / layout:
 *
 *   const access = await requireInstructorAccess();
 *   if (access.gate === 'unauthenticated') redirect('/instructor/login');
 *   if (access.gate === 'pending_approval')  redirect('/instructor/approval-pending');
 *   if (access.gate === 'needs_onboarding')  redirect('/instructor/onboarding');
 *   // gate === 'ready' — render children
 */

import { getServerSession, getSupabaseServer, getSupabaseServerAdmin } from '@/lib/supabaseServer';

// ── Types ──────────────────────────────────────────────────────────────────

export type InstructorGate =
  | 'unauthenticated'
  | 'pending_approval'
  | 'needs_onboarding'
  | 'ready';

export interface InstructorRow {
  id: string;
  approval_status: string | null;
  onboarding_status: string | null;
  profile_status: string | null;
}

export interface InstructorSession {
  user: { id?: string; email?: string | null };
  access_token?: string;
}

export interface InstructorAccessResult {
  session: InstructorSession | null;
  instructor: InstructorRow | null;
  gate: InstructorGate;
  /** Human-readable reason when gate is not 'ready'. */
  errorMessage?: string;
}

// ── Columns we SELECT ──────────────────────────────────────────────────────

const PROFILE_COLUMNS = 'id, approval_status, onboarding_status, profile_status' as const;

// ── Implementation ─────────────────────────────────────────────────────────

export async function requireInstructorAccess(): Promise<InstructorAccessResult> {
  // ── 1. Session ──────────────────────────────────────────────────────────
  let session: InstructorSession | null = null;
  try {
    session = await getServerSession();
  } catch {
    return {
      session: null,
      instructor: null,
      gate: 'unauthenticated',
      errorMessage: 'Session retrieval failed',
    };
  }

  if (!session?.user?.id) {
    return {
      session: null,
      instructor: null,
      gate: 'unauthenticated',
      errorMessage: 'No active session',
    };
  }

  // ── 2. Supabase client ──────────────────────────────────────────────────
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return {
      session,
      instructor: null,
      gate: 'unauthenticated',
      errorMessage: 'Supabase client not available (missing env vars)',
    };
  }

  const userId = session.user.id;

  // ── 3. Fetch instructor_profiles row ────────────────────────────────────
  let instructor: InstructorRow | null = null;

  try {
    // Prefer user_id (reconciled schema)
    const byUser = await supabase
      .from('instructor_profiles')
      .select(PROFILE_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle<InstructorRow>();

    if (byUser.data) {
      instructor = byUser.data;
    }

    // Fallback: id = userId (legacy schema)
    if (!instructor) {
      const byId = await supabase
        .from('instructor_profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle<InstructorRow>();

      instructor = byId.data ?? null;
    }
  } catch (err) {
    return {
      session,
      instructor: null,
      gate: 'unauthenticated',
      errorMessage: `Profile query failed: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }

  // ── 4. Insert row if missing. Prefer service-role client so RLS cannot block. ─────
  if (!instructor) {
    try {
      const admin = await getSupabaseServerAdmin();
      const insertClient = admin ?? supabase;

      const inserted = await insertClient
        .from('instructor_profiles')
        .insert({
          user_id: userId,
          approval_status: 'pending',
          profile_status: 'draft',
          full_name: '',
        })
        .select(PROFILE_COLUMNS)
        .maybeSingle<InstructorRow>();

      if (inserted.data) {
        instructor = inserted.data;
      } else {
        if (inserted.error) {
          console.error('[requireInstructorAccess] instructor_profiles insert (user_id) failed:', inserted.error.message, inserted.error.code);
        }
        const legacy = await insertClient
          .from('instructor_profiles')
          .insert({
            id: userId,
            approval_status: 'pending',
            full_name: '',
          })
          .select(PROFILE_COLUMNS)
          .maybeSingle<InstructorRow>();
        if (legacy.data) {
          instructor = legacy.data;
        } else {
          if (legacy.error) {
            console.error('[requireInstructorAccess] instructor_profiles insert (legacy id) failed:', legacy.error.message, legacy.error.code);
          }
          const retry = await supabase
            .from('instructor_profiles')
            .select(PROFILE_COLUMNS)
            .or(`user_id.eq.${userId},id.eq.${userId}`)
            .maybeSingle<InstructorRow>();
          instructor = retry.data ?? null;
        }
      }
    } catch (err) {
      return {
        session,
        instructor: null,
        gate: 'unauthenticated',
        errorMessage: `Profile insert failed: ${err instanceof Error ? err.message : 'unknown'}`,
      };
    }
  }

  // Still nothing — database issue, don't throw
  if (!instructor) {
    return {
      session,
      instructor: null,
      gate: 'unauthenticated',
      errorMessage: 'Could not load or create instructor profile',
    };
  }

  // ── 5. Gate logic ───────────────────────────────────────────────────────
  if (instructor.approval_status !== 'approved') {
    return {
      session,
      instructor,
      gate: 'pending_approval',
      errorMessage: `Approval status: ${instructor.approval_status ?? 'unknown'}`,
    };
  }

  const onboardingDone =
    instructor.onboarding_status === 'completed' ||
    instructor.profile_status === 'active';

  if (!onboardingDone) {
    return {
      session,
      instructor,
      gate: 'needs_onboarding',
      errorMessage: `Onboarding status: ${instructor.onboarding_status ?? 'unknown'}`,
    };
  }

  // ── 6. Ready ────────────────────────────────────────────────────────────
  return {
    session,
    instructor,
    gate: 'ready',
  };
}

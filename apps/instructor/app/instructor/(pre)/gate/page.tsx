import { redirect } from 'next/navigation';
import { getSupabaseServer, getSupabaseServerAdmin, getServerSession } from '@/lib/supabaseServer';

function isSafeNext(next: string | null | undefined): boolean {
  if (!next || typeof next !== 'string') return false;
  const t = next.trim();
  if (!t.startsWith('/')) return false;
  if (t.startsWith('//')) return false;
  return true;
}

type InstructorRow = {
  id: string;
  approval_status: string | null;
  onboarding_status: string | null;
  profile_status: string | null;
};

/**
 * Single gate: session → ensure instructor_profiles row (user_id or id = auth user) → redirect by state.
 * Insert-only; on unique violation we re-SELECT and continue.
 */
export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  const userId = session.user.id;

  // 1) Load instructor_profiles by user_id (reconciled) or id (legacy)
  let { data: instructor } = await supabase
    .from('instructor_profiles')
    .select('id, approval_status, onboarding_status, profile_status')
    .eq('user_id', userId)
    .maybeSingle<InstructorRow>();

  if (!instructor) {
    const byId = await supabase
      .from('instructor_profiles')
      .select('id, approval_status, onboarding_status, profile_status')
      .eq('id', userId)
      .maybeSingle<InstructorRow>();
    instructor = byId.data ?? null;
  }

  // 2) If no row, insert minimal profile. Prefer service-role client so RLS cannot block the insert.
  if (!instructor) {
    const admin = await getSupabaseServerAdmin();
    const insertClient = admin ?? supabase;

    const withUserId = await insertClient
      .from('instructor_profiles')
      .insert({
        user_id: userId,
        approval_status: 'pending',
        profile_status: 'draft',
        full_name: '',
      })
      .select('id, approval_status, onboarding_status, profile_status')
      .maybeSingle<InstructorRow>();

    if (withUserId.data) {
      instructor = withUserId.data;
    } else {
      if (withUserId.error) {
        console.error('[gate] instructor_profiles insert (user_id) failed:', withUserId.error.message, withUserId.error.code);
      }
      // Legacy schema: id = auth user id; minimal columns to avoid "column does not exist"
      const legacy = await insertClient
        .from('instructor_profiles')
        .insert({
          id: userId,
          approval_status: 'pending',
          full_name: '',
        })
        .select('id, approval_status, onboarding_status, profile_status')
        .maybeSingle<InstructorRow>();
      instructor = legacy.data ?? null;
      if (!instructor && legacy.error) {
        console.error('[gate] instructor_profiles insert (legacy id) failed:', legacy.error.message, legacy.error.code);
      }
    }
    if (!instructor) {
      const retry = await supabase
        .from('instructor_profiles')
        .select('id, approval_status, onboarding_status, profile_status')
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle<InstructorRow>();
      instructor = retry.data ?? null;
    }
  }

  if (!instructor?.id) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  // 3) Redirect by state
  if (instructor.approval_status !== 'approved') {
    redirect('/instructor/approval-pending');
  }
  const onboardingDone =
    instructor.onboarding_status === 'completed' || instructor.profile_status === 'active';
  if (!onboardingDone) {
    redirect('/instructor/onboarding');
  }

  const params = await searchParams;
  const nextParam = typeof params.next === 'string' ? params.next : Array.isArray(params.next) ? params.next[0] : undefined;
  if (isSafeNext(nextParam)) {
    redirect(nextParam!);
  }
  redirect('/instructor/dashboard');
}

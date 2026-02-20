import { redirect } from 'next/navigation';
import { getSupabaseServer, getServerSession } from '@/lib/supabaseServer';

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

  // 2) If no row, ensure profile via API (same DB as admin; no RLS).
  if (!instructor && session.access_token) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3001';
    try {
      const res = await fetch(`${apiBase}/instructor/ensure-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; profile?: InstructorRow };
        if (data?.ok && data?.profile) instructor = data.profile;
      }
    } catch (e) {
      console.error('[gate] ensure-profile request failed:', e);
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

import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession, getSupabaseServer } from '@/lib/supabaseServer';
import AppShell from '@/components/shell/AppShell';

export const dynamic = 'force-dynamic';

type InstructorRow = {
  id: string;
  approval_status: string | null;
  onboarding_status: string | null;
  profile_status: string | null;
};

/**
 * Hard guard for (app) routes: session → instructor_profiles row → approved → onboarding completed.
 * Uses instructor_profiles (user_id or id = auth user). Profile/settings use (account) layout.
 */
export default async function InstructorAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getServerSession();
  } catch (e) {
    redirect('/instructor/login?next=/instructor/dashboard&err=session');
  }
  if (!session?.user?.id) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  const userId = session.user.id;
  let instructor: InstructorRow | null = null;
  let queryError: unknown = null;
  try {
    // Prefer user_id (reconciled schema); fallback id = userId (legacy)
    const byUser = await supabase
      .from('instructor_profiles')
      .select('id, approval_status, onboarding_status, profile_status')
      .eq('user_id', userId)
      .maybeSingle<InstructorRow>();
    if (byUser.data) {
      instructor = byUser.data;
    } else {
      queryError = byUser.error;
    }
    if (!instructor) {
      const byId = await supabase
        .from('instructor_profiles')
        .select('id, approval_status, onboarding_status, profile_status')
        .eq('id', userId)
        .maybeSingle<InstructorRow>();
      instructor = byId.data ?? null;
      if (!instructor) queryError = byId.error ?? queryError;
    }
  } catch (e) {
    queryError = e;
  }

  if (queryError || !instructor?.id) {
    redirect('/instructor/gate');
  }

  if (instructor.approval_status !== 'approved') {
    redirect('/instructor/approval-pending');
  }

  const onboardingDone =
    instructor.onboarding_status === 'completed' || instructor.profile_status === 'active';
  if (!onboardingDone) {
    redirect('/instructor/onboarding');
  }

  return <AppShell>{children}</AppShell>;
}

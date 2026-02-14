import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession, getSupabaseServer } from '@/lib/supabaseServer';
import AppShell from '@/components/shell/AppShell';

export const dynamic = 'force-dynamic';

type InstructorRow = {
  id: string;
  approval_status: string | null;
};

/**
 * Layout for profile and settings: session + approved only.
 * No onboarding gate so the user can always open Profile/Settings.
 */
export default async function InstructorAccountLayout({
  children,
}: {
  children: React.ReactNode;
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
  let { data: instructor, error } = await supabase
    .from('instructor_profiles')
    .select('id, approval_status')
    .eq('user_id', userId)
    .maybeSingle<InstructorRow>();
  if (!instructor && !error) {
    const byId = await supabase
      .from('instructor_profiles')
      .select('id, approval_status')
      .eq('id', userId)
      .maybeSingle<InstructorRow>();
    instructor = byId.data ?? null;
    error = byId.error ?? error;
  }

  if (error || !instructor?.id) {
    redirect('/instructor/gate');
  }

  if (instructor.approval_status !== 'approved') {
    redirect('/instructor/approval-pending');
  }

  return <AppShell>{children}</AppShell>;
}

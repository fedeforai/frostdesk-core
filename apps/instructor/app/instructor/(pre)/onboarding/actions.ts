'use server';

import { getSupabaseServer, getServerSession } from '@/lib/supabaseServer';

/** Mark current user's instructor row as onboarding completed. Uses server session (cookies). */
export async function completeOnboardingAction(): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession();
  if (!session?.user?.id) return { ok: false, error: 'Sessione non trovata.' };
  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: 'Configuration error' };
  const uid = session.user.id;
  const { data, error } = await supabase
    .from('instructor_profiles')
    .update({ onboarding_status: 'completed', profile_status: 'active' })
    .or(`user_id.eq.${uid},id.eq.${uid}`)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Nessuna riga aggiornata (RLS?).' };
  return { ok: true };
}

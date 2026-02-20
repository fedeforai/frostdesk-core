import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer, getServerSession } from '@/lib/supabaseServer';
import InstructorOnboardingForm from '@/components/onboarding/InstructorOnboardingForm';

/**
 * Onboarding form: compile profile, then upsert instructor_profiles and set onboarding completed.
 * Accessible only when approved and onboarding not yet completed.
 */
export default async function OnboardingFormPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return (
      <div style={{ padding: '2rem', maxWidth: '640px', margin: '0 auto', background: '#0b1220', color: '#e5e7eb', minHeight: '100vh' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Complete onboarding</h1>
        <p style={{ color: '#fecaca' }}>Configuration error.</p>
      </div>
    );
  }

  const uid = session.user.id;
  let { data: row, error: fetchError } = await supabase
    .from('instructor_profiles')
    .select('id, onboarding_status, approval_status, profile_status')
    .eq('user_id', uid)
    .maybeSingle();
  if (!row && !fetchError) {
    const byId = await supabase
      .from('instructor_profiles')
      .select('id, onboarding_status, approval_status, profile_status')
      .eq('id', uid)
      .maybeSingle();
    row = byId.data;
    fetchError = byId.error ?? fetchError;
  }

  if (fetchError || !row) {
    redirect('/instructor/gate');
  }

  const approvalStatus = (row as { approval_status: string | null }).approval_status;
  const status =
    (row as { onboarding_status?: string | null }).onboarding_status ??
    ((row as { profile_status?: string | null }).profile_status === 'active' ? 'completed' : null) ??
    'pending';

  if (approvalStatus !== 'approved') {
    redirect('/instructor/approval-pending');
  }
  if (status === 'completed') {
    redirect('/instructor/dashboard');
  }

  let { data: draftRow } = await supabase
    .from('instructor_profiles')
    .select('full_name, base_resort, working_language, whatsapp_phone, onboarding_payload')
    .eq('user_id', uid)
    .maybeSingle();
  if (!draftRow) {
    const byId = await supabase
      .from('instructor_profiles')
      .select('full_name, base_resort, working_language, whatsapp_phone, onboarding_payload')
      .eq('id', uid)
      .maybeSingle();
    draftRow = byId.data ?? null;
  }

  const initialDraft =
    draftRow != null
      ? {
          full_name: (draftRow as { full_name?: string | null }).full_name ?? null,
          base_resort: (draftRow as { base_resort?: string | null }).base_resort ?? null,
          working_language: (draftRow as { working_language?: string | null }).working_language ?? null,
          whatsapp_phone: (draftRow as { whatsapp_phone?: string | null }).whatsapp_phone ?? null,
          onboarding_payload: (draftRow as { onboarding_payload?: Record<string, unknown> | null }).onboarding_payload ?? null,
        }
      : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b1220',
        color: '#e5e7eb',
        padding: '2.5rem 1.5rem',
      }}
    >
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#e5e7eb',
            marginBottom: '0.5rem',
          }}
        >
          Complete your profile
        </h1>
        <p
          style={{
            color: '#94a3b8',
            fontSize: '1rem',
            lineHeight: 1.6,
            marginBottom: '1rem',
          }}
        >
          Enter the required data below. It will be used for your card and for contacts with students.
        </p>
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.85)',
            borderRadius: '12px',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', marginBottom: '0.25rem' }}>
            Privacy
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
            Your data is processed in compliance with privacy regulations and used only for the FrostDesk service.
          </p>
        </div>

        <InstructorOnboardingForm userEmail={session.user.email ?? null} initialDraft={initialDraft} />

        <p style={{ marginTop: '1.5rem', fontSize: '12px', color: '#94a3b8' }}>
          <Link
            href="/instructor/onboarding"
            style={{
              color: '#e5e7eb',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            ← Back to onboarding page
          </Link>
        </p>
      </div>
    </div>
  );
}

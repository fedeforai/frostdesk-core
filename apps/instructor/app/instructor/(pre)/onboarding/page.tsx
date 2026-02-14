import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer, getServerSession } from '@/lib/supabaseServer';

type InstructorRow = {
  id: string;
  contact_email: string | null;
  created_at: string | null;
  onboarding_status: string | null;
  approval_status: string | null;
  profile_status: string | null;
};

/**
 * Onboarding: gate ensures instructor_profiles row. Redirect to gate if no row; approval-pending if not approved; dashboard if completed.
 */
export default async function InstructorOnboardingPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect('/instructor/login?next=/instructor/gate');
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Instructor onboarding</h1>
        <p style={{ color: '#991b1b' }}>Configuration error</p>
      </div>
    );
  }

  const uid = session.user.id;
  let { data: row, error: fetchError } = await supabase
    .from('instructor_profiles')
    .select('id, contact_email, created_at, onboarding_status, approval_status, profile_status')
    .eq('user_id', uid)
    .maybeSingle();
  if (!row && !fetchError) {
    const byId = await supabase
      .from('instructor_profiles')
      .select('id, contact_email, created_at, onboarding_status, approval_status, profile_status')
      .eq('id', uid)
      .maybeSingle();
    row = byId.data;
    fetchError = byId.error ?? fetchError;
  }

  if (fetchError) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Instructor onboarding</h1>
        <p style={{ color: '#991b1b' }}>{fetchError.message ?? 'Failed to load instructor'}</p>
      </div>
    );
  }

  if (!row) {
    redirect('/instructor/gate');
  }

  const instructor = row as InstructorRow;
  const status =
    instructor.onboarding_status ??
    (instructor.profile_status === 'active' ? 'completed' : null) ??
    'pending';
  const approvalStatus = instructor.approval_status ?? 'pending';

  if (approvalStatus !== 'approved') {
    redirect('/instructor/approval-pending');
  }
  if (status === 'completed') {
    redirect('/instructor/dashboard');
  }

  const id = instructor.id;
  const email = instructor.email ?? session.user.email ?? '—';
  const whatsapp = instructor.whatsapp_connected === true;

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        Instructor onboarding
      </h1>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <span style={{ color: '#6b7280' }}>Instructor ID: </span>
            <span>{id}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Email: </span>
            <span>{email}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Onboarding status: </span>
            <span>{status}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>WhatsApp connected: </span>
            <span>{whatsapp ? 'yes' : 'no'}</span>
          </div>
        </div>
      </div>

      <p style={{ marginTop: '1rem' }}>
        <Link
          href="/instructor/onboarding/form"
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Vai al form di onboarding
        </Link>
      </p>

      <p style={{ marginTop: '0.5rem' }}>
        <Link href="/instructor/gate" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
          Back to gate
        </Link>
      </p>
    </div>
  );
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServer, getServerSession } from '@/lib/supabaseServer';
import CompleteOnboardingButton from '@/components/CompleteOnboardingButton';

type InstructorRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  onboarding_status: string | null;
  whatsapp_connected: boolean | null;
  approval_status: string | null;
};

/**
 * Instructor Onboarding — ensures instructor profile exists in DB.
 * RALPH-safe: no throw, no redirects; session → check/insert instructors → render.
 */
export default async function InstructorOnboardingPage() {
  let session: { user: { id?: string; email?: string | null } } | null = null;
  let instructor: InstructorRow | null = null;
  let errorMessage: string | null = null;

  try {
    session = await getServerSession();
    const supabase = await getSupabaseServer();
    if (!supabase) {
      errorMessage = 'Configuration error';
    } else if (session?.user?.id) {
        const { data: row, error: fetchError } = await supabase
          .from('instructors')
          .select('id, email, created_at, onboarding_status, whatsapp_connected, approval_status')
          .eq('id', session.user.id)
          .maybeSingle();

        if (fetchError) {
          errorMessage = fetchError.message ?? 'Failed to load instructor';
        } else if (!row) {
          const { error: insertError } = await supabase.from('instructors').insert({
            id: session.user.id,
            email: session.user.email ?? null,
            onboarding_status: 'pending',
            whatsapp_connected: false,
          });
          if (insertError) {
            errorMessage = insertError.message ?? 'Failed to create instructor';
          } else {
            instructor = {
              id: session.user.id,
              email: session.user.email ?? null,
              created_at: new Date().toISOString(),
              onboarding_status: 'pending',
              whatsapp_connected: false,
              approval_status: 'pending',
            };
          }
        } else {
          instructor = row as InstructorRow;
        }
    }
  } catch {
    errorMessage = errorMessage ?? 'An error occurred';
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Instructor onboarding
        </h1>
        <p style={{ color: '#6b7280' }}>Not authenticated</p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/instructor/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Instructor onboarding
        </h1>
        <p style={{ color: '#991b1b', marginBottom: '1rem' }}>{errorMessage}</p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Instructor ID: {session.user?.id ?? '—'}
        </p>
      </div>
    );
  }

  const id = instructor?.id ?? session.user?.id ?? '—';
  const email = instructor?.email ?? session.user?.email ?? '—';
  const status = instructor?.onboarding_status ?? 'pending';
  const approvalStatus = instructor?.approval_status ?? 'pending';
  const whatsapp = instructor?.whatsapp_connected === true;

  if (status === 'completed') {
    redirect('/instructor/dashboard');
  }

  if (approvalStatus === 'pending') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Instructor onboarding
        </h1>
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          Il tuo profilo è in attesa di approvazione. Potrai completare l&apos;onboarding quando un amministratore avrà approvato il tuo account.
        </div>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            Esci
          </Link>
        </p>
      </div>
    );
  }

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

      {status !== 'completed' && (
        <CompleteOnboardingButton />
      )}

      <p style={{ marginTop: '0.5rem' }}>
        <Link href="/instructor/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}

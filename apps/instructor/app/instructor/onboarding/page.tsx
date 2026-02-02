import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import CompleteOnboardingButton from '@/components/CompleteOnboardingButton';

type InstructorRow = {
  id: string;
  email: string | null;
  created_at: string | null;
  onboarding_status: string | null;
  whatsapp_connected: boolean | null;
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      errorMessage = 'Configuration error';
    } else {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData.session;

      if (session?.user?.id) {
        const { data: row, error: fetchError } = await supabase
          .from('instructors')
          .select('id, email, created_at, onboarding_status, whatsapp_connected')
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
            };
          }
        } else {
          instructor = row as InstructorRow;
        }
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
  const whatsapp = instructor?.whatsapp_connected === true;

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

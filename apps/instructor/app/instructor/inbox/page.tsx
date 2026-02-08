import Link from 'next/link';
import { getSupabaseServer, getServerSession } from '@/lib/supabaseServer';
import HumanInboxPage from '@/components/inbox/HumanInboxPage';

export const dynamic = 'force-dynamic';

/**
 * Instructor Inbox: session/onboarding/approval gates, then same inbox UI as admin (no admin token/auth banner).
 */
export default async function InstructorInboxPage() {
  let session: { user: { id?: string } } | null = null;
  let onboardingStatus: string | null = null;
  let approvalStatus: string | null = null;
  let loadError: string | null = null;

  try {
    session = await getServerSession();
    const supabase = await getSupabaseServer();
    if (!supabase) {
      loadError = 'Configuration error';
    } else if (session?.user?.id) {
        const { data: row, error } = await supabase
          .from('instructors')
          .select('onboarding_status, approval_status')
          .eq('id', session.user.id)
          .maybeSingle();
        if (error) {
          loadError = error.message ?? 'Failed to load instructor';
        } else if (row) {
          onboardingStatus = row.onboarding_status ?? null;
          approvalStatus = row.approval_status ?? null;
        }
    }
  } catch {
    loadError = loadError ?? 'An error occurred';
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Not authenticated</p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/instructor/login" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>
            Go to login
          </Link>
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>{loadError}</p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/instructor/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  if (approvalStatus === 'pending') {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
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
          Il tuo profilo è in attesa di approvazione. Potrai accedere all&apos;inbox quando un amministratore avrà approvato il tuo account.
        </div>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/instructor/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  if (onboardingStatus !== 'completed') {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Complete onboarding to access your inbox.
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/instructor/onboarding" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>
            Go to onboarding
          </Link>
        </p>
      </div>
    );
  }

  if (approvalStatus === 'rejected') {
    return (
      <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
          Inbox
        </h1>
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            color: '#991b1b',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Profile not approved</div>
          <div>Please contact support.</div>
        </div>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/instructor/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  return <HumanInboxPage />;
}

import Link from 'next/link';
import { getSupabaseServer, getServerSession } from '@/lib/supabaseServer';
import InstructorDashboardClient from '@/components/dashboard/InstructorDashboardClient';

/**
 * Instructor Dashboard: session/onboarding/approval gates, then Automation + KPIs + cards UI.
 */
export default async function InstructorDashboardPage() {
  let session: { user: { id?: string; email?: string | null; created_at?: string } } | null = null;

  try {
    session = await getServerSession();
  } catch {
    // Supabase unavailable or env missing
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Instructor Dashboard
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

  let onboardingComplete = false;
  let approvalStatus: string = '—';
  try {
    const userId = session.user?.id;
    if (userId) {
      const supabase = await getSupabaseServer();
      if (supabase) {
        const { data: row } = await supabase
          .from('instructors')
          .select('onboarding_status, approval_status')
          .eq('id', userId)
          .maybeSingle();
        onboardingComplete = row?.onboarding_status === 'completed';
        approvalStatus = row?.approval_status ?? '—';
      }
    }
  } catch {
    // leave onboardingComplete false, approvalStatus '—'
  }

  const approvalForBanner = approvalStatus === '—' || !approvalStatus ? 'pending' : approvalStatus;

  if (approvalStatus === 'pending') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Instructor Dashboard
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
          Il tuo profilo è in attesa di approvazione. Potrai accedere a dashboard e onboarding quando un amministratore avrà approvato il tuo account.
        </div>
        <p style={{ marginTop: '0.5rem' }}>
          <Link href="/login" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            Esci
          </Link>
        </p>
      </div>
    );
  }

  if (!onboardingComplete) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Instructor Dashboard
        </h1>
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          Onboarding incomplete.{' '}
          <Link href="/instructor/onboarding" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
            Complete onboarding
          </Link>
        </div>
      </div>
    );
  }

  if (approvalStatus === 'rejected') {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
          Instructor Dashboard
        </h1>
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#991b1b' }}>
            Profile not approved
          </div>
          <div style={{ color: '#991b1b' }}>Please contact support.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {approvalForBanner === 'pending' && (
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
          <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#92400e' }}>
            Profile under review
          </div>
          <div style={{ color: '#92400e' }}>
            Your profile is being reviewed. Inbox and messaging are read-only.
          </div>
        </div>
      )}
      {approvalForBanner === 'approved' && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#166534' }}>
            Profile approved
          </div>
          <div style={{ color: '#166534' }}>You can access Inbox and messaging.</div>
        </div>
      )}
      <InstructorDashboardClient />
    </>
  );
}

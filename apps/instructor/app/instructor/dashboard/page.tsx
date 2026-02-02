import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

/**
 * Read-only diagnostic Instructor Dashboard.
 * Uses only Supabase session; no admin API, no mutations, no AI/WhatsApp.
 * Always renders (RALPH-safe): no throw, fallback when session or Supabase unavailable.
 */
export default async function InstructorDashboardPage() {
  let session: { user: { id?: string; email?: string | null; created_at?: string } } | null = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data } = await supabase.auth.getSession();
      session = data.session;
    }
  } catch {
    // Supabase unavailable or env missing: show not authenticated
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const userId = session.user?.id;
    if (supabaseUrl && supabaseAnonKey && userId) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: row } = await supabase
        .from('instructors')
        .select('onboarding_status, approval_status')
        .eq('id', userId)
        .maybeSingle();
      onboardingComplete = row?.onboarding_status === 'completed';
      approvalStatus = row?.approval_status ?? '—';
    }
  } catch {
    // leave onboardingComplete false, approvalStatus '—'
  }

  const approvalLabel =
    approvalStatus === 'pending'
      ? 'Pending review'
      : approvalStatus === 'approved'
        ? 'Approved'
        : approvalStatus === 'rejected'
          ? 'Rejected'
          : approvalStatus;

  // Treat missing approval_status as pending for banner logic
  const approvalForBanner = approvalStatus === '—' || !approvalStatus ? 'pending' : approvalStatus;

  const userId = session.user?.id ?? '—';
  const email = session.user?.email ?? '—';
  const createdAt = session.user?.created_at ?? '—';
  const createdLabel =
    typeof createdAt === 'string' && createdAt !== '—'
      ? new Date(createdAt).toISOString().slice(0, 10)
      : '—';

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
        Instructor Dashboard
      </h1>

      {!onboardingComplete && (
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
      )}

      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
        Session: logged
      </p>

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Profile
        </h2>
        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <span style={{ color: '#6b7280' }}>Instructor ID: </span>
            <span>{userId}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Email: </span>
            <span>{email}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Created at: </span>
            <span>{createdLabel}</span>
          </div>
          <div>
            <span style={{ color: '#6b7280' }}>Approval status: </span>
            <span>{approvalLabel}</span>
          </div>
        </div>
      </div>

      {onboardingComplete && approvalForBanner === 'pending' && (
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
            Your profile is being reviewed by the admin. Inbox and messaging are read-only.
          </div>
        </div>
      )}

      {onboardingComplete && approvalForBanner === 'rejected' && (
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
          <div style={{ color: '#991b1b' }}>
            Please contact support.
          </div>
        </div>
      )}

      {onboardingComplete && approvalForBanner === 'approved' && (
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
          <div style={{ color: '#166534' }}>
            You can now access Inbox features.
          </div>
        </div>
      )}

      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          System status
        </h2>
        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>WhatsApp: Not connected</div>
          <div>AI: Disabled</div>
          <div>Conversations: 0</div>
        </div>
      </div>
    </div>
  );
}

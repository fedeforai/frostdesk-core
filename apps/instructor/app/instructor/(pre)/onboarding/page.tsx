import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireInstructorAccess } from '@/lib/access/requireInstructorAccess';

/**
 * Instructor Onboarding — gate-aware (inverted: 'ready' redirects OUT).
 */
export default async function InstructorOnboardingPage() {
  const access = await requireInstructorAccess();

  // ── unauthenticated ──────────────────────────────────────────────────────
  if (access.gate === 'unauthenticated') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(226,232,240,0.95)', marginBottom: '0.75rem' }}>
          Session expired
        </h1>
        <p style={{ color: 'rgba(148,163,184,0.85)', marginBottom: '1rem' }}>
          {access.errorMessage ?? 'Log in to complete onboarding.'}
        </p>
        <Link
          href="/instructor/login?next=/instructor/onboarding"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: 'rgba(59,130,246,0.15)',
            color: '#93c5fd',
            border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
          }}
        >
          Login
        </Link>
      </div>
    );
  }

  // ── pending_approval ─────────────────────────────────────────────────────
  if (access.gate === 'pending_approval') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(226,232,240,0.95)', marginBottom: '0.75rem' }}>
          Account in attesa di approvazione
        </h1>
        <p style={{ color: 'rgba(148,163,184,0.85)', marginBottom: '1rem' }}>
          Your instructor profile is under review. You will be able to complete onboarding after approval.
        </p>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 8,
          color: '#fbbf24',
          fontSize: '0.8125rem',
        }}>
          Stato: {access.instructor?.approval_status ?? 'pending'}
        </div>
      </div>
    );
  }

  // ── ready → onboarding already done, go to dashboard ─────────────────────
  if (access.gate === 'ready') {
    redirect('/instructor/dashboard');
  }

  // ── needs_onboarding → render the onboarding UI ──────────────────────────
  const instructor = access.instructor!;
  const email = instructor.id ? (access.session?.user?.email ?? '—') : '—';

  return (
    <div style={{ padding: '2rem', maxWidth: '600px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem', color: 'rgba(226,232,240,0.95)' }}>
        Instructor onboarding
      </h1>

      <div
        style={{
          border: '1px solid rgba(71,85,105,0.4)',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: 'rgba(30,41,59,0.4)',
        }}
      >
        <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div>
            <span style={{ color: 'rgba(148,163,184,0.85)' }}>Instructor ID: </span>
            <code style={{ fontSize: '0.8125rem', color: '#7dd3fc' }}>{instructor.id}</code>
          </div>
          <div>
            <span style={{ color: 'rgba(148,163,184,0.85)' }}>Email: </span>
            <span style={{ color: 'rgba(226,232,240,0.92)' }}>{email}</span>
          </div>
          <div>
            <span style={{ color: 'rgba(148,163,184,0.85)' }}>Onboarding status: </span>
            <span style={{ color: '#fbbf24' }}>{instructor.onboarding_status ?? 'pending'}</span>
          </div>
        </div>
      </div>

      <p style={{ marginTop: '1rem' }}>
        <Link
          href="/instructor/onboarding/form"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          Go to onboarding form
        </Link>
      </p>
    </div>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireInstructorAccess } from '@/lib/access/requireInstructorAccess';
import HumanInboxPage from '@/components/inbox/HumanInboxPage';

export const dynamic = 'force-dynamic';

/**
 * Instructor Inbox — gate-aware.
 */
export default async function InstructorInboxPage() {
  const access = await requireInstructorAccess();

  if (access.gate === 'unauthenticated') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(226,232,240,0.95)', marginBottom: '0.75rem' }}>
          Session expired
        </h1>
        <p style={{ color: 'rgba(148,163,184,0.85)', marginBottom: '1rem' }}>
          {access.errorMessage ?? 'Log in to access the inbox.'}
        </p>
        <Link
          href="/instructor/login?next=/instructor/inbox"
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

  if (access.gate === 'pending_approval') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(226,232,240,0.95)', marginBottom: '0.75rem' }}>
          Account in attesa di approvazione
        </h1>
        <p style={{ color: 'rgba(148,163,184,0.85)', marginBottom: '1rem' }}>
          Your instructor profile is under review. You will receive a notification as soon as it is approved.
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

  if (access.gate === 'needs_onboarding') {
    redirect('/instructor/onboarding');
  }

  // gate === 'ready'
  return <HumanInboxPage />;
}

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireInstructorAccess } from '@/lib/access/requireInstructorAccess';
import TodayPageClient from '@/components/dashboard/TodayPageClient';

export const dynamic = 'force-dynamic';

const fallback = (
  <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
    Loading…
  </div>
);

/**
 * Today page — daily control view (bookings today, next lesson, unpaid, proposals).
 */
export default async function TodayPage() {
  const access = await requireInstructorAccess();

  if (access.gate === 'unauthenticated') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(226,232,240,0.95)', marginBottom: '0.75rem' }}>
          Session expired
        </h1>
        <p style={{ color: 'rgba(148,163,184,0.85)', marginBottom: '1rem' }}>
          {access.errorMessage ?? 'Log in to access this page.'}
        </p>
        <Link
          href="/instructor/login?next=/instructor/today"
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
          Your instructor profile is under review.
        </p>
      </div>
    );
  }

  if (access.gate === 'needs_onboarding') {
    redirect('/instructor/onboarding');
  }

  return (
    <Suspense fallback={fallback}>
      <TodayPageClient />
    </Suspense>
  );
}

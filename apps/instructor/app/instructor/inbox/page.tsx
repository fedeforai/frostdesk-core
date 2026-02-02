import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Instructor Inbox (read-only v1). RALPH-safe: no throw, no redirect, no admin imports.
 * Gates: session → onboarding completed → inbox shell + static placeholder list.
 */
export default async function InstructorInboxPage() {
  let session: { user: { id?: string } } | null = null;
  let onboardingStatus: string | null = null;
  let approvalStatus: string | null = null;
  let loadError: string | null = null;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      loadError = 'Configuration error';
    } else {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData.session;

      if (session?.user?.id) {
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

  // Inbox v1 gating: rejected → no access
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

  const underReview = approvalStatus !== 'approved';
  const subtext = underReview
    ? 'Your profile is under review. Messaging is read-only.'
    : 'Inbox (read-only v1)';

  const placeholderConversations = [
    { name: 'Client A', preview: 'Hi, I’d like to book a lesson.', timestamp: 'Today, 10:00' },
    { name: 'Client B', preview: 'Thanks for the availability.', timestamp: 'Yesterday, 15:30' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
        Inbox
      </h1>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        {subtext}
      </p>

      {underReview && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            color: '#92400e',
          }}
        >
          Your profile is under review by FrostDesk team.
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {placeholderConversations.map((conv, i) => (
          <li
            key={i}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              marginBottom: '0.5rem',
              padding: '1rem',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>{conv.name}</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {conv.preview}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {conv.timestamp}
            </div>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: '1rem' }}>
        <Link href="/instructor/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline', fontSize: '0.875rem' }}>
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}

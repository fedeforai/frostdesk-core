'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';

/**
 * Button to mark instructor onboarding as completed.
 * RALPH-safe: try/catch, no throw; success → router.refresh(), error → inline message.
 */
export default function CompleteOnboardingButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClick = async () => {
    setErrorMessage(null);
    setSuccess(false);

    try {
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setErrorMessage('Configuration error');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setErrorMessage('Not signed in');
        return;
      }

      const uid = session.user.id;
      const { error } = await supabase
        .from('instructor_profiles')
        .update({ onboarding_status: 'completed', profile_status: 'active' })
        .or(`user_id.eq.${uid},id.eq.${uid}`);

      if (error) {
        setErrorMessage(error.message ?? 'Update failed');
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setErrorMessage('An error occurred');
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <button
        type="button"
        onClick={handleClick}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Complete onboarding
      </button>
      {errorMessage && (
        <p style={{ marginTop: '0.5rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {errorMessage}
        </p>
      )}
      {success && (
        <p style={{ marginTop: '0.5rem', color: '#059669', fontSize: '0.875rem' }}>
          Onboarding completed.
        </p>
      )}
    </div>
  );
}

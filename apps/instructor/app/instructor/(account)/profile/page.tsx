'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchInstructorProfile } from '@/lib/instructorApi';
import type { InstructorProfile } from '@/lib/instructorApi';
import ProfileForm from '@/components/ProfileForm';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<InstructorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const data = await fetchInstructorProfile();
      setProfile(data ?? null);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status ?? 500;
      setErrorStatus(status);
      if (status === 401) {
        router.replace('/instructor/gate');
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading && !profile && !errorStatus) {
    return (
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <p style={{ color: '#6b7280' }}>Loading profile…</p>
      </div>
    );
  }

  const isEmptyProfile =
    profile &&
    !profile.full_name &&
    !profile.base_resort &&
    !profile.working_language &&
    !profile.contact_email;

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
        Profilo
      </h1>

      {isEmptyProfile && (
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Configura il tuo profilo compilando i campi sotto.
        </p>
      )}

      {(errorStatus === 403 || (errorStatus && errorStatus !== 401)) && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.875rem',
          color: '#991b1b',
        }}>
          <span>
            {errorStatus === 403
              ? 'Not authorized. You do not have permission to access this page.'
              : "Couldn't load profile. Check your connection and retry."}
          </span>
          {errorStatus !== 403 && (
            <button
              type="button"
              onClick={() => void loadProfile()}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #f87171',
                background: '#fff',
                color: '#991b1b',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.8125rem',
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      }}>
        <ProfileForm profile={profile} onSaved={setProfile} />
      </div>
    </div>
  );
}

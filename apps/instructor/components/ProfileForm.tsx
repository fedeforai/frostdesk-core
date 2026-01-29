'use client';

import { useState } from 'react';
import type { InstructorProfile, UpdateInstructorProfileParams } from '@/lib/instructorApi';
import { updateInstructorProfile } from '@/lib/instructorApi';

interface ProfileFormProps {
  profile: InstructorProfile | null;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [baseResort, setBaseResort] = useState(profile?.base_resort || '');
  const [workingLanguage, setWorkingLanguage] = useState(profile?.working_language || '');
  const [contactEmail, setContactEmail] = useState(profile?.contact_email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !baseResort.trim() || !workingLanguage.trim() || !contactEmail.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: UpdateInstructorProfileParams = {
        full_name: fullName.trim(),
        base_resort: baseResort.trim(),
        working_language: workingLanguage.trim(),
        contact_email: contactEmail.trim(),
      };

      await updateInstructorProfile(params);
      window.location.reload();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save profile';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '0.375rem',
            border: '1px solid #fca5a5',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="full_name"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Full Name *
        </label>
        <input
          type="text"
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="base_resort"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Base Resort *
        </label>
        <input
          type="text"
          id="base_resort"
          value={baseResort}
          onChange={(e) => setBaseResort(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label
          htmlFor="working_language"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Working Language *
        </label>
        <input
          type="text"
          id="working_language"
          value={workingLanguage}
          onChange={(e) => setWorkingLanguage(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="contact_email"
          style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
          }}
        >
          Contact Email *
        </label>
        <input
          type="email"
          id="contact_email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          aria-required="true"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !fullName.trim() || !baseResort.trim() || !workingLanguage.trim() || !contactEmail.trim()}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: loading ? '#d1d5db' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: '500',
          outline: 'none',
        }}
        onFocus={(e) => {
          if (!loading) {
            e.currentTarget.style.outline = '2px solid #3b82f6';
            e.currentTarget.style.outlineOffset = '2px';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
        aria-label="Save profile"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}

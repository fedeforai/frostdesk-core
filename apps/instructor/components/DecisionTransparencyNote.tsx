'use client';

/**
 * STEP 6.0 — Decision Transparency (UI only).
 * Explains why suggestions are shown using booking context. Read-only, no AI mention.
 * STEP 6.2 — Soft dismissal (session-only, no persistence).
 */

import { useState } from 'react';

export type DecisionTransparencyNoteProps = {
  bookingStatus: 'draft' | 'pending' | 'confirmed' | null;
  showNote?: boolean;
};

function getCopy(bookingStatus: 'draft' | 'pending' | 'confirmed' | null): string {
  switch (bookingStatus) {
    case 'confirmed':
      return 'This conversation is linked to a confirmed booking. Replies are shown to help you close the loop smoothly.';
    case 'pending':
      return 'This conversation is linked to a pending booking. Suggested replies focus on confirmation and clarity.';
    case 'draft':
      return 'This conversation is linked to a draft booking. Suggested replies focus on confirmation and clarity.';
    case null:
    default:
      return 'This conversation has no booking yet. Replies focus on understanding the request.';
  }
}

export default function DecisionTransparencyNote({
  bookingStatus,
  showNote = false,
}: DecisionTransparencyNoteProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!showNote || dismissed) {
    return null;
  }

  const copy = getCopy(bookingStatus);

  return (
    <div
      style={{
        position: 'relative',
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        backgroundColor: '#f9fafb',
        fontSize: '0.8125rem',
      }}
      aria-label="Why you're seeing this"
    >
      <button
        type="button"
        aria-label="Hide explanation"
        title="Hide explanation"
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          fontSize: '0.75rem',
          color: '#9ca3af',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#6b7280';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af';
        }}
      >
        ×
      </button>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>
        Why you're seeing this
      </div>
      <div style={{ color: '#374151', lineHeight: 1.4 }}>{copy}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', lineHeight: 1.4 }}>
        You're always in control. Suggested replies are optional.
      </div>
    </div>
  );
}

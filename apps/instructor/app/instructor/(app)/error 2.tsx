'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function InstructorAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[instructor app error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#0b1220',
        color: '#e5e7eb',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          padding: 24,
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 12,
          background: 'rgba(15,23,42,0.9)',
        }}
      >
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>Qualcosa è andato storto</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>
          {error.message || 'Loading error'}
        </p>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
          If the API is not running, execute: <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>pnpm --filter @frostdesk/api dev</code>
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.3)',
              background: '#1e293b',
              color: '#e5e7eb',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
          <Link
            href="/instructor/dashboard"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid rgba(148,163,184,0.3)',
              background: '#1e293b',
              color: '#e5e7eb',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

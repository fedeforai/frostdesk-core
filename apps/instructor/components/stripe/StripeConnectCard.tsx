'use client';

import { useState, useEffect } from 'react';
import {
  getStripeConnectStatus,
  initiateStripeConnect,
  refreshStripeConnect,
  type StripeConnectStatusResponse,
} from '@/lib/instructorApi';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; description: string }> = {
  not_connected: {
    label: 'Non collegato',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    description: 'Connect your Stripe account to receive payments directly from customers.',
  },
  pending: {
    label: 'In attesa',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    description: 'Onboarding in progress. Complete the setup on Stripe to enable payments.',
  },
  enabled: {
    label: 'Attivo',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.15)',
    description: 'Your Stripe account is active. You can receive payments from customers.',
  },
  restricted: {
    label: 'Limitato',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    description: 'Your Stripe account has restrictions. Verify the required information.',
  },
};

const lightContainer = {
  padding: '1.25rem',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  background: '#ffffff',
};

const darkContainer = {
  padding: '1.25rem',
  border: '1px solid rgba(148, 163, 184, 0.25)',
  borderRadius: 10,
  background: 'rgba(30, 41, 59, 0.4)',
};

export function StripeConnectCard({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const [status, setStatus] = useState<StripeConnectStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLight = variant === 'light';

  useEffect(() => {
    getStripeConnectStatus()
      .then(setStatus)
      .catch(() => setStatus({ status: 'not_connected', chargesEnabled: false, detailsSubmitted: false }))
      .finally(() => setLoading(false));
  }, []);

  async function handleConnect() {
    setError(null);
    setActing(true);
    try {
      const result = await initiateStripeConnect();
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setActing(false);
    }
  }

  async function handleRefresh() {
    setError(null);
    setActing(true);
    try {
      const result = await refreshStripeConnect();
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setActing(false);
    }
  }

  const config = STATUS_CONFIG[status?.status ?? 'not_connected'] ?? STATUS_CONFIG.not_connected;

  const containerStyle = isLight ? lightContainer : darkContainer;
  const titleColor = isLight ? '#111827' : 'rgba(226, 232, 240, 0.95)';
  const bodyColor = isLight ? '#6b7280' : 'rgba(148, 163, 184, 0.85)';
  const loadingColor = isLight ? '#6b7280' : 'rgba(148, 163, 184, 0.7)';
  const errorColor = isLight ? '#dc2626' : '#fca5a5';
  const enabledBadgeMuted = isLight ? '#6b7280' : 'rgba(148, 163, 184, 0.7)';

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <strong style={{ fontSize: '1rem', color: titleColor }}>
          Stripe Connect
        </strong>
        {!loading && (
          <span style={{
            display: 'inline-block',
            padding: '0.15rem 0.5rem',
            borderRadius: 4,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: config.color,
            background: config.bg,
          }}>
            {config.label}
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ fontSize: '0.8125rem', color: loadingColor }}>Loading...</p>
      ) : (
        <>
          <p style={{ fontSize: '0.8125rem', color: bodyColor, marginBottom: '0.75rem' }}>
            {config.description}
          </p>

          {error && (
            <p style={{ color: errorColor, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{error}</p>
          )}

          {status?.status === 'not_connected' && (
            <button
              type="button"
              onClick={handleConnect}
              disabled={acting}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isLight ? '#3b82f6' : '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: acting ? 'not-allowed' : 'pointer',
              }}
            >
              {acting ? 'Loading...' : 'Connect Stripe'}
            </button>
          )}

          {(status?.status === 'pending' || status?.status === 'restricted') && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={acting}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: isLight ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.2)',
                color: isLight ? '#b45309' : 'rgba(251, 191, 36, 0.95)',
                border: isLight ? '1px solid #f59e0b' : 'none',
                borderRadius: 6,
                cursor: acting ? 'not-allowed' : 'pointer',
              }}
            >
              {acting ? 'Loading...' : 'Complete onboarding'}
            </button>
          )}

          {status?.status === 'enabled' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#22c55e' }}>
                Pagamenti abilitati
              </span>
              {status.chargesEnabled && (
                <span style={{
                  fontSize: '0.6875rem',
                  color: enabledBadgeMuted,
                  padding: '0.1rem 0.35rem',
                  border: `1px solid ${isLight ? '#d1d5db' : 'rgba(148, 163, 184, 0.2)'}`,
                  borderRadius: 3,
                }}>
                  charges_enabled
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

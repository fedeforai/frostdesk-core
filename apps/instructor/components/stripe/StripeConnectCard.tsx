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

export function StripeConnectCard() {
  const [status, setStatus] = useState<StripeConnectStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div style={{
      padding: '1.25rem',
      border: '1px solid rgba(148, 163, 184, 0.25)',
      borderRadius: 10,
      background: 'rgba(30, 41, 59, 0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <strong style={{ fontSize: '1rem', color: 'rgba(226, 232, 240, 0.95)' }}>
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
        <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.7)' }}>Loading...</p>
      ) : (
        <>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.85)', marginBottom: '0.75rem' }}>
            {config.description}
          </p>

          {error && (
            <p style={{ color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{error}</p>
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
                background: '#6366f1',
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
                background: 'rgba(245, 158, 11, 0.2)',
                color: 'rgba(251, 191, 36, 0.95)',
                border: 'none',
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
                  color: 'rgba(148, 163, 184, 0.7)',
                  padding: '0.1rem 0.35rem',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
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

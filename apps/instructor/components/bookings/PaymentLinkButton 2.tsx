'use client';

import { useState, useEffect } from 'react';
import {
  getStripeConnectStatus,
  initiateStripeConnect,
  generatePaymentLink,
  getBookingPaymentInfo,
  type StripeConnectStatusResponse,
  type BookingPaymentInfo,
} from '@/lib/instructorApi';

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  unpaid: { label: 'Unpaid', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  pending: { label: 'Payment pending', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  paid: { label: 'Paid', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
  failed: { label: 'Payment failed', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  refunded: { label: 'Refunded', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
};

export function PaymentLinkButton({ bookingId }: { bookingId: string }) {
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatusResponse | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<BookingPaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Amount input (in EUR, displayed as euros, stored as cents)
  const [amountEur, setAmountEur] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [cs, pi] = await Promise.all([
          getStripeConnectStatus().catch(() => null),
          getBookingPaymentInfo(bookingId).catch(() => null),
        ]);
        setConnectStatus(cs);
        setPaymentInfo(pi);
      } catch {
        // Stripe not configured, silently ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingId]);

  async function handleConnect() {
    setError(null);
    setConnecting(true);
    try {
      const result = await initiateStripeConnect();
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start Stripe Connect');
    } finally {
      setConnecting(false);
    }
  }

  async function handleGenerateLink() {
    const cents = Math.round(parseFloat(amountEur) * 100);
    if (!cents || cents <= 0) {
      setError('Enter a valid amount (e.g. 120.00)');
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const result = await generatePaymentLink(bookingId, cents, 'eur');
      setPaymentInfo({
        paymentStatus: 'pending',
        checkoutSessionId: result.checkoutSessionId,
        paymentUrl: result.url,
        paidAt: null,
        chargeId: null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate payment link');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    if (paymentInfo?.paymentUrl) {
      navigator.clipboard.writeText(paymentInfo.paymentUrl).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div style={{ marginTop: '1rem', padding: '0.75rem', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, background: 'rgba(15,23,42,0.4)' }}>
        <span style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.7)' }}>Loading payment...</span>
      </div>
    );
  }

  // Payment status badge
  const statusInfo = PAYMENT_STATUS_LABELS[paymentInfo?.paymentStatus ?? 'unpaid'] ?? PAYMENT_STATUS_LABELS.unpaid;

  return (
    <div style={{
      marginTop: '1rem',
      padding: '1rem',
      border: '1px solid rgba(148,163,184,0.25)',
      borderRadius: 10,
      background: 'rgba(15,23,42,0.5)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <strong style={{ fontSize: '0.875rem', color: 'rgba(226,232,240,0.95)' }}>Payment</strong>
        <span style={{
          display: 'inline-block',
          padding: '0.15rem 0.5rem',
          borderRadius: 4,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: statusInfo.color,
          background: statusInfo.bg,
        }}>
          {statusInfo.label}
        </span>
      </div>

      {error && (
        <p style={{ color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{error}</p>
      )}

      {/* Not connected to Stripe */}
      {(!connectStatus || connectStatus.status === 'not_connected') && (
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.85)', marginBottom: '0.5rem' }}>
            Connect your Stripe account to receive payments from customers.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: connecting ? 'not-allowed' : 'pointer',
            }}
          >
            {connecting ? 'Connecting...' : 'Connect Stripe'}
          </button>
        </div>
      )}

      {/* Stripe pending/restricted */}
      {connectStatus && (connectStatus.status === 'pending' || connectStatus.status === 'restricted') && (
        <div>
          <p style={{ fontSize: '0.8125rem', color: '#f59e0b', marginBottom: '0.5rem' }}>
            {connectStatus.status === 'pending'
              ? 'Stripe onboarding in progress. Complete the setup to enable payments.'
              : 'Your Stripe account has restrictions. Verify your account.'}
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: 'rgba(245, 158, 11, 0.2)',
              color: 'rgba(251, 191, 36, 0.95)',
              border: 'none',
              borderRadius: 6,
              cursor: connecting ? 'not-allowed' : 'pointer',
            }}
          >
            {connecting ? 'Loading...' : 'Complete Stripe onboarding'}
          </button>
        </div>
      )}

      {/* Connected and payment is already pending or paid */}
      {connectStatus?.status === 'enabled' && paymentInfo?.paymentStatus === 'pending' && paymentInfo.paymentUrl && (
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.85)', marginBottom: '0.5rem' }}>
            Payment link generated. Send it to the customer:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={paymentInfo.paymentUrl}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                fontSize: '0.8125rem',
                background: 'rgba(15,23,42,0.7)',
                color: 'rgba(226,232,240,0.9)',
                border: '1px solid rgba(148,163,184,0.3)',
                borderRadius: 6,
              }}
            />
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.8125rem',
                background: copied ? '#22c55e' : 'rgba(99,102,241,0.8)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                minWidth: '4rem',
              }}
            >
              {copied ? 'Copiato!' : 'Copia'}
            </button>
          </div>
        </div>
      )}

      {/* Connected and paid */}
      {connectStatus?.status === 'enabled' && paymentInfo?.paymentStatus === 'paid' && (
        <div>
          <p style={{ fontSize: '0.8125rem', color: '#22c55e' }}>
            Payment received{paymentInfo.paidAt ? ` on ${new Date(paymentInfo.paidAt).toLocaleDateString('en-GB')}` : ''}.
          </p>
        </div>
      )}

      {/* Connected and unpaid — show generate form */}
      {connectStatus?.status === 'enabled' && (!paymentInfo || paymentInfo.paymentStatus === 'unpaid' || paymentInfo.paymentStatus === 'failed') && (
        <div>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(148,163,184,0.85)', marginBottom: '0.5rem' }}>
            Generate a payment link for this booking.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(148,163,184,0.7)', marginBottom: '0.15rem' }}>
                Amount (EUR)
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="120.00"
                value={amountEur}
                onChange={(e) => setAmountEur(e.target.value)}
                style={{
                  width: '8rem',
                  padding: '0.4rem 0.6rem',
                  fontSize: '0.875rem',
                  background: 'rgba(15,23,42,0.7)',
                  color: 'rgba(226,232,240,0.95)',
                  border: '1px solid rgba(148,163,184,0.3)',
                  borderRadius: 6,
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={generating}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? 'Generating...' : 'Generate payment link'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

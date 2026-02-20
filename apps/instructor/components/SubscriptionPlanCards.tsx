'use client';

/**
 * Phase 2 — Plan cards (read-only). Pilot as current; Pro/School as "Coming soon".
 * No billing API calls; no CTAs that change subscription state.
 */

const cardStyle = {
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '0.5rem',
  padding: '1rem',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  flex: 1,
  minWidth: 160,
} as const;

const selectedBadge = {
  display: 'inline-block',
  padding: '0.2rem 0.5rem',
  borderRadius: 999,
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'rgba(34, 197, 94, 0.95)',
  background: 'rgba(34, 197, 94, 0.15)',
  marginBottom: '0.5rem',
} as const;

export default function SubscriptionPlanCards() {
  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
      <div style={cardStyle}>
        <span style={selectedBadge}>Selected</span>
        <div style={{ fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
          Pilot
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.5rem' }}>
          Current access
        </div>
        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.85)', lineHeight: 1.5 }}>
          <li>Smart inbox and booking management</li>
          <li>Optional AI assistance</li>
          <li>Read-only operational logs</li>
        </ul>
      </div>

      <div style={cardStyle}>
        <span style={{ ...selectedBadge, color: 'rgba(148, 163, 184, 0.9)', background: 'rgba(148, 163, 184, 0.15)' }}>
          Coming soon
        </span>
        <div style={{ fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
          Pro
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.5rem' }}>
          €29 / month
        </div>
        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.85)', lineHeight: 1.5 }}>
          <li>For active instructors with steady bookings</li>
          <li>Priority support</li>
          <li>Unlimited lessons</li>
        </ul>
      </div>

      <div style={cardStyle}>
        <span style={{ ...selectedBadge, color: 'rgba(148, 163, 184, 0.9)', background: 'rgba(148, 163, 184, 0.15)' }}>
          Coming soon
        </span>
        <div style={{ fontWeight: 600, color: 'rgba(226, 232, 240, 0.95)', marginBottom: '0.25rem' }}>
          School
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'rgba(148, 163, 184, 0.9)', marginBottom: '0.5rem' }}>
          Contact us
        </div>
        <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.85)', lineHeight: 1.5 }}>
          <li>Multi-instructor management</li>
          <li>Custom onboarding</li>
          <li>Shared inbox</li>
        </ul>
      </div>
    </div>
  );
}

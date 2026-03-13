/**
 * STEP 8.2 — Subscription surface (read-only).
 * Shows pilot status and future subscription context. No pricing, no CTAs, no logic.
 */

export default function SubscriptionStatusPanel() {
  return (
    <div style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.9)', lineHeight: 1.4, marginTop: '1rem' }}>
      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'rgba(226, 232, 240, 0.95)' }}>Subscription</div>
      <div style={{ marginBottom: '0.5rem' }}>Status: Pilot access</div>
      <div style={{ marginBottom: '0.75rem' }}>
        You are currently using FrostDesk during pilot access. Some advanced features may require
        an active subscription in the future.
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', marginBottom: '0.75rem' }}>
        <li style={{ marginBottom: '0.25rem' }}>Smart inbox and booking management</li>
        <li style={{ marginBottom: '0.25rem' }}>Optional AI assistance</li>
        <li>Read-only operational logs</li>
      </ul>
      <div style={{ fontSize: '0.6875rem', color: 'rgba(148, 163, 184, 0.75)' }}>
        Billing and subscriptions are handled separately.
      </div>
    </div>
  );
}

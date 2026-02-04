/**
 * STEP 8.0 — FrostDesk SaaS mental model (UI-only).
 * Explains what FrostDesk is, what is included, what may require a subscription.
 * No billing, no Stripe, no persistence.
 */

export default function UsingFrostDeskNote() {
  return (
    <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.4 }}>
      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Using FrostDesk</div>
      <div style={{ marginBottom: '0.5rem' }}>
        FrostDesk is a professional tool for individual instructors. Some features are available during
        pilot access, while others may require an active subscription in the future.
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.25rem', marginBottom: '0.5rem' }}>
        <li style={{ marginBottom: '0.25rem' }}>You are always in control of messages and bookings.</li>
        <li style={{ marginBottom: '0.25rem' }}>AI suggestions are optional.</li>
        <li>Payments and advanced automation may require a subscription.</li>
      </ul>
      <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '0.5rem' }}>
        Feature availability may vary based on your plan.
      </div>
      <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>
        Billing and subscriptions will be handled separately.
      </div>
    </div>
  );
}

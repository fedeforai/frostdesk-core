/**
 * CR2 Billing Gate: helpers for billing status checks.
 * billing_status lives on instructor_profiles (added in CR2 Loop 1).
 * 'pilot' and 'active' are allowed; 'past_due' and 'cancelled' are blocked.
 */

export type BillingStatus = 'pilot' | 'active' | 'past_due' | 'cancelled';

/**
 * Returns true if the billing status allows mutations.
 * 'pilot' counts as allowed during the transition period.
 */
export function isBillingAllowed(status: BillingStatus | string | null | undefined): boolean {
  return status === 'pilot' || status === 'active';
}

/**
 * Returns null if billing allows the mutation, or an error payload if blocked.
 * Use after the pilot gate check (CR1) — only reached by pilot instructors.
 */
export function checkBillingGate(billingStatus: string): { error: string; message: string } | null {
  if (isBillingAllowed(billingStatus)) return null;
  return {
    error: 'BILLING_BLOCKED',
    message: 'Billing required to use this feature.',
  };
}

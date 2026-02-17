/**
 * Singleton Stripe SDK client.
 * Uses STRIPE_SECRET_KEY from environment.
 */
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  _stripe = new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  });

  return _stripe;
}

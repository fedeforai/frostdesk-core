-- Stripe webhook event idempotency table.
-- Prevents processing the same event twice.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stripe_webhook_events IS 'Dedup table for Stripe webhook events. PK on event_id ensures at-most-once processing.';

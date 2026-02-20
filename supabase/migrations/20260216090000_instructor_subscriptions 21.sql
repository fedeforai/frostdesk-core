CREATE TABLE IF NOT EXISTS instructor_subscriptions (
  instructor_id UUID PRIMARY KEY REFERENCES instructor_profiles(id) ON DELETE CASCADE,

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  status TEXT NOT NULL DEFAULT 'none',
  CHECK (status IN (
    'none',
    'trialing',
    'active',
    'past_due',
    'incomplete',
    'canceled'
  )),

  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instructor_subscriptions_status
ON instructor_subscriptions(status);

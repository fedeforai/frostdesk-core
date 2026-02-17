-- CR2 Loop 5: Stripe prep fields (nullable, no logic yet).

ALTER TABLE instructor_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL;

ALTER TABLE instructor_profiles
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NULL;

ALTER TABLE instructor_profiles
  ADD COLUMN IF NOT EXISTS current_plan TEXT NULL;

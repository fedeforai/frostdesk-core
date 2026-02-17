-- CR2 Billing Gate: add billing_status to instructor_profiles.
-- Default 'pilot' so existing rows are valid with no backfill.

ALTER TABLE instructor_profiles
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'pilot';

ALTER TABLE instructor_profiles
  DROP CONSTRAINT IF EXISTS chk_billing_status;

ALTER TABLE instructor_profiles
  ADD CONSTRAINT chk_billing_status
  CHECK (billing_status IN ('pilot', 'active', 'past_due', 'cancelled'));

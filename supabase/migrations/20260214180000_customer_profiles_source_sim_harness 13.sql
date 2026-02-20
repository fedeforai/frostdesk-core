-- Add 'sim_harness' to the allowed values for customer_profiles.source.
--
-- Why: The conversation simulation harness (apps/api/src/dev/sim_harness.ts)
-- creates test customer profiles with source = 'sim_harness' so they can be
-- easily identified and cleaned up independently of real customer data.
-- Without this value the INSERT violates customer_profiles_source_check.
--
-- This migration is:
--   - Backward compatible: existing rows are untouched, all previous values remain valid.
--   - Idempotent: DROP IF EXISTS before re-adding the constraint.
--   - Non-destructive: no data is modified or deleted.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'customer_profiles'
  ) THEN
    ALTER TABLE public.customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_source_check;
    ALTER TABLE public.customer_profiles ADD CONSTRAINT customer_profiles_source_check
      CHECK (source IN ('whatsapp', 'web', 'referral', 'manual', 'booking', 'sim_harness'));
  END IF;
END $$;

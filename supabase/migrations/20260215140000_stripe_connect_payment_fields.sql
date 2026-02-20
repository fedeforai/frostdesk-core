-- Stripe Connect + Payment fields (additive, backward compatible)
-- instructor_profiles: Express account linkage
-- bookings: payment tracking via Checkout Sessions on connected accounts

-- ── instructor_profiles: Connect fields ──────────────────────────────────────

ALTER TABLE public.instructor_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'instructor_profiles'
      AND column_name = 'stripe_connect_status'
  ) THEN
    ALTER TABLE public.instructor_profiles
      ADD COLUMN stripe_connect_status TEXT NOT NULL DEFAULT 'not_connected';

    ALTER TABLE public.instructor_profiles
      ADD CONSTRAINT instructor_profiles_stripe_connect_status_check
      CHECK (stripe_connect_status IN ('not_connected', 'pending', 'enabled', 'restricted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_stripe_account_id
  ON public.instructor_profiles (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- ── bookings: payment tracking ───────────────────────────────────────────────
-- Guard: only run if bookings table exists (it may not be on Supabase cloud yet)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    -- payment_status
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'payment_status'
    ) THEN
      ALTER TABLE public.bookings
        ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
      ALTER TABLE public.bookings
        ADD CONSTRAINT bookings_payment_status_check
        CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
    END IF;

    -- checkout_session_id
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checkout_session_id TEXT NULL;
    -- charge_id
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS charge_id TEXT NULL;
    -- connected_account_id (snapshot of instructor stripe_account_id at payment time)
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS connected_account_id TEXT NULL;
    -- paid_at
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;
    -- payment_url (Checkout URL for sharing)
    ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_url TEXT NULL;

    -- Indexes for webhook lookups
    CREATE INDEX IF NOT EXISTS idx_bookings_checkout_session_id
      ON public.bookings (checkout_session_id) WHERE checkout_session_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
      ON public.bookings (payment_status) WHERE payment_status != 'unpaid';
  END IF;
END $$;

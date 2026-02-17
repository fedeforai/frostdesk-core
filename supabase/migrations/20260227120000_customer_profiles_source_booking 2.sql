-- Allow source = 'booking' for customer_profiles (booking-created customers).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_profiles') THEN
    ALTER TABLE public.customer_profiles DROP CONSTRAINT IF EXISTS customer_profiles_source_check;
    ALTER TABLE public.customer_profiles ADD CONSTRAINT customer_profiles_source_check
      CHECK (source IN ('whatsapp', 'web', 'referral', 'manual', 'booking'));
  END IF;
END $$;

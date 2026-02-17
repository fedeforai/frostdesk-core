-- Add onboarding_payload and whatsapp_phone to instructor_profiles (idempotent).
-- onboarding_completed_at may already exist from 20260131120000.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'onboarding_completed_at') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN onboarding_completed_at timestamptz NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'onboarding_payload') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN onboarding_payload jsonb NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'whatsapp_phone') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN whatsapp_phone text NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'updated_at') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
  END IF;
END $$;

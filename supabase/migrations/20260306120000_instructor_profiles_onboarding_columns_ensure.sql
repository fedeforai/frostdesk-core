-- Ensure onboarding_completed_at and onboarding_status exist on instructor_profiles.
-- Idempotent: safe when table was created from reconcile (20260222) without these columns.
-- completeInstructorOnboarding() sets both; requireInstructorAccess() reads onboarding_status.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'onboarding_completed_at') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN onboarding_completed_at timestamptz NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'onboarding_status') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN onboarding_status text NULL;
    END IF;
  END IF;
END $$;

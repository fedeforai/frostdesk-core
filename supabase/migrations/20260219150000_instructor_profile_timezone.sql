-- Instructor timezone for display and event conversion only. All storage remains UTC.
-- Idempotent.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'timezone') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
    END IF;
  END IF;
END $$;

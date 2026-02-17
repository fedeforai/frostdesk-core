-- Instructor app core tables: instructor_profiles (if missing) and instructor_services.
-- Fixes 500 on GET/POST /api/instructor/services when DB lacks schema.
-- Safe: CREATE TABLE IF NOT EXISTS; no destructive changes.

-- 1) instructor_profiles: base table (id = auth.users.id). Other migrations add columns idempotently.
CREATE TABLE IF NOT EXISTS public.instructor_profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  base_resort TEXT NOT NULL DEFAULT '',
  working_language TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed_at TIMESTAMPTZ,
  approval_status TEXT,
  onboarding_status TEXT,
  onboarding_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  whatsapp_phone TEXT
);

-- 2) instructor_services: required by instructor services API.
CREATE TABLE IF NOT EXISTS public.instructor_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  discipline TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructor_services_instructor_id
  ON public.instructor_services (instructor_id);

-- FK only if instructor_profiles exists (e.g. this migration created it above).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'instructor_services' AND constraint_name = 'fk_instructor_services_instructor'
    ) THEN
      ALTER TABLE public.instructor_services ADD CONSTRAINT fk_instructor_services_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

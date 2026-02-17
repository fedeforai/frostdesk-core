-- Date-specific overrides for instructor availability (add or remove time ranges).
-- Recurring template is instructor_availability; overrides apply to specific UTC datetime ranges.
-- Idempotent, backward compatible.

CREATE TABLE IF NOT EXISTS public.instructor_availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_override_times CHECK (start_utc < end_utc)
);

CREATE INDEX IF NOT EXISTS idx_instructor_availability_overrides_instructor_id
  ON public.instructor_availability_overrides (instructor_id);

CREATE INDEX IF NOT EXISTS idx_instructor_availability_overrides_range
  ON public.instructor_availability_overrides (instructor_id, start_utc, end_utc);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'instructor_availability_overrides' AND constraint_name = 'fk_instructor_availability_overrides_instructor'
    ) THEN
      ALTER TABLE public.instructor_availability_overrides
        ADD CONSTRAINT fk_instructor_availability_overrides_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Instructor availability windows (day of week + time slots).
-- Required by GET/POST/PATCH /instructor/availability and conflict detection.
-- Safe: CREATE TABLE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS public.instructor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_availability_times CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor_id
  ON public.instructor_availability (instructor_id);

CREATE INDEX IF NOT EXISTS idx_instructor_availability_day_active
  ON public.instructor_availability (day_of_week, is_active) WHERE is_active = true;

-- FK to instructor_profiles if that table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'instructor_availability' AND constraint_name = 'fk_instructor_availability_instructor'
    ) THEN
      ALTER TABLE public.instructor_availability
        ADD CONSTRAINT fk_instructor_availability_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Meeting points per instructor (where to meet clients). Required by GET/POST/PATCH /instructor/meeting-points.

CREATE TABLE IF NOT EXISTS public.instructor_meeting_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  address TEXT NULL,
  latitude DOUBLE PRECISION NULL,
  longitude DOUBLE PRECISION NULL,
  what3words TEXT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructor_meeting_points_instructor_id
  ON public.instructor_meeting_points (instructor_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'instructor_meeting_points' AND constraint_name = 'fk_instructor_meeting_points_instructor'
    ) THEN
      ALTER TABLE public.instructor_meeting_points
        ADD CONSTRAINT fk_instructor_meeting_points_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Optional location (meeting point) per availability window.
-- NULL = available at all locations (backward compatible).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_availability') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_availability' AND column_name = 'meeting_point_id') THEN
      ALTER TABLE public.instructor_availability
        ADD COLUMN meeting_point_id UUID NULL;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_meeting_points') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'instructor_availability' AND constraint_name = 'fk_instructor_availability_meeting_point') THEN
      ALTER TABLE public.instructor_availability
        ADD CONSTRAINT fk_instructor_availability_meeting_point
        FOREIGN KEY (meeting_point_id) REFERENCES public.instructor_meeting_points(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

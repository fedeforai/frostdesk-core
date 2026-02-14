-- Cache of calendar events (e.g. from Google) for conflict detection and sellable slots.
-- Required by listAvailabilityCalendarConflicts and calendar sync. No sensitive event bodies.

CREATE TABLE IF NOT EXISTS public.calendar_events_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  external_event_id TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  title TEXT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_instructor_id
  ON public.calendar_events_cache (instructor_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_cache_instructor_start
  ON public.calendar_events_cache (instructor_id, start_at);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'calendar_events_cache' AND constraint_name = 'fk_calendar_events_cache_instructor'
    ) THEN
      ALTER TABLE public.calendar_events_cache
        ADD CONSTRAINT fk_calendar_events_cache_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

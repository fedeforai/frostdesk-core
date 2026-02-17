-- Mirror of external calendar busy events (e.g. Google). No sensitive event details.
-- Used for conflict detection and slot generation. All times UTC.
-- Idempotent, backward compatible.

CREATE TABLE IF NOT EXISTS public.external_busy_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  connection_id UUID NOT NULL,
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  start_utc TIMESTAMPTZ NOT NULL,
  end_utc TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'busy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_external_busy_times CHECK (start_utc < end_utc)
);

CREATE INDEX IF NOT EXISTS idx_external_busy_blocks_instructor_id
  ON public.external_busy_blocks (instructor_id);

CREATE INDEX IF NOT EXISTS idx_external_busy_blocks_range
  ON public.external_busy_blocks (instructor_id, start_utc, end_utc);

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_busy_blocks_connection_external_id
  ON public.external_busy_blocks (connection_id, external_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'external_busy_blocks' AND constraint_name = 'fk_external_busy_blocks_instructor'
    ) THEN
      ALTER TABLE public.external_busy_blocks
        ADD CONSTRAINT fk_external_busy_blocks_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_connections') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'external_busy_blocks' AND constraint_name = 'fk_external_busy_blocks_connection'
    ) THEN
      ALTER TABLE public.external_busy_blocks
        ADD CONSTRAINT fk_external_busy_blocks_connection
        FOREIGN KEY (connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

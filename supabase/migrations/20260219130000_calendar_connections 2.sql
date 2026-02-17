-- OAuth connection metadata for external calendars (e.g. Google).
-- Tokens and refresh tokens stored here; do not log or expose.
-- Idempotent, backward compatible.

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_calendar_connections_instructor_provider UNIQUE (instructor_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_instructor_id
  ON public.calendar_connections (instructor_id);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_status
  ON public.calendar_connections (instructor_id, status);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'calendar_connections' AND constraint_name = 'fk_calendar_connections_instructor'
    ) THEN
      ALTER TABLE public.calendar_connections
        ADD CONSTRAINT fk_calendar_connections_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

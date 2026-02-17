-- Calendar connections: scopes, calendar_ids (jsonb). Status as enum-like (idempotent).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_connections') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_connections' AND column_name = 'scopes') THEN
      ALTER TABLE public.calendar_connections ADD COLUMN scopes JSONB NULL DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_connections' AND column_name = 'calendar_ids') THEN
      ALTER TABLE public.calendar_connections ADD COLUMN calendar_ids JSONB NULL DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.calendar_connections.scopes IS 'OAuth scopes granted; do not log.';
COMMENT ON COLUMN public.calendar_connections.calendar_ids IS 'Calendar IDs to sync (e.g. primary); do not log tokens.';

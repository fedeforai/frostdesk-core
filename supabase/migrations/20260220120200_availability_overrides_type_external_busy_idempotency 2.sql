-- Availability overrides: add type enum (add|block). External busy blocks: idempotency unique + summary_hash (idempotent).

-- 1) instructor_availability_overrides: add override_type (add = extra window, block = remove)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_availability_overrides') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_availability_overrides' AND column_name = 'override_type') THEN
      ALTER TABLE public.instructor_availability_overrides ADD COLUMN override_type TEXT NOT NULL DEFAULT 'block'
        CHECK (override_type IN ('add', 'block'));
    END IF;
  END IF;
END $$;

-- 2) external_busy_blocks: summary_hash (no PII), idempotency unique on (instructor_id, source_event_id, start_ts, end_ts)
--    Existing columns: external_id (= source_event_id), start_utc/end_utc (= start_ts/end_ts). Add source_calendar_id, summary_hash if missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'external_busy_blocks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_busy_blocks' AND column_name = 'source_calendar_id') THEN
      ALTER TABLE public.external_busy_blocks ADD COLUMN source_calendar_id TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_busy_blocks' AND column_name = 'summary_hash') THEN
      ALTER TABLE public.external_busy_blocks ADD COLUMN summary_hash TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_busy_blocks' AND column_name = 'updated_at') THEN
      ALTER TABLE public.external_busy_blocks ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
  END IF;
END $$;

-- Idempotency: one block per (instructor_id, external_id, start_utc, end_utc) for sync dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_busy_blocks_instructor_event_range
  ON public.external_busy_blocks (instructor_id, external_id, start_utc, end_utc);

COMMENT ON COLUMN public.external_busy_blocks.summary_hash IS 'Hash of event summary for debugging; no PII.';

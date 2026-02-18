-- Professional service model: add name, lesson_type, participants, short_description, sort_order.
-- Additive only; existing columns and rows unchanged. New columns nullable or with defaults.

ALTER TABLE public.instructor_services
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS min_participants INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Constrain lesson_type to allowed values (optional; allows NULL for legacy rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'instructor_services_lesson_type_check'
  ) THEN
    ALTER TABLE public.instructor_services
      ADD CONSTRAINT instructor_services_lesson_type_check
      CHECK (lesson_type IS NULL OR lesson_type IN ('private', 'semi_private', 'group'));
  END IF;
END $$;

-- Backfill name from discipline where name is null
UPDATE public.instructor_services
SET name = COALESCE(NULLIF(TRIM(discipline), ''), 'Servizio')
WHERE name IS NULL OR TRIM(name) = '';

ALTER TABLE public.instructor_services
  ALTER COLUMN name SET DEFAULT '';

COMMENT ON COLUMN public.instructor_services.name IS 'Display name for the service (e.g. "Lezione privata sci 2h")';
COMMENT ON COLUMN public.instructor_services.lesson_type IS 'private | semi_private | group';
COMMENT ON COLUMN public.instructor_services.short_description IS 'Optional 1-2 lines for listings; max 200 chars recommended';
COMMENT ON COLUMN public.instructor_services.sort_order IS 'Order in list; lower first';

-- display_name: nullable for draft/incomplete profiles, partial unique, no blank when set.
-- Idempotent. Fixes ERROR 23502 null value in column "display_name".

-- 1) Make display_name nullable (safe if already nullable)
ALTER TABLE public.instructor_profiles
  ALTER COLUMN display_name DROP NOT NULL;

-- 2) Drop default so NULL is allowed explicitly (idempotent: only if default exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instructor_profiles'
      AND column_name = 'display_name' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.instructor_profiles ALTER COLUMN display_name DROP DEFAULT;
  END IF;
END $$;

-- 3) Backfill NULL with '' only for rows that have NULL (optional; keeps existing behaviour for reads)
-- UPDATE public.instructor_profiles SET display_name = '' WHERE display_name IS NULL;
-- We do NOT backfill: allow NULL for drafts.

-- 3.5) Normalise blank display_name to NULL so the check constraint can be added
UPDATE public.instructor_profiles
SET display_name = NULL
WHERE display_name IS NOT NULL AND trim(display_name) = '';

-- 4) Check: when set, must not be blank (allow NULL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_instructor_profiles_display_name_not_blank') THEN
    ALTER TABLE public.instructor_profiles
      ADD CONSTRAINT chk_instructor_profiles_display_name_not_blank
      CHECK (display_name IS NULL OR trim(display_name) <> '');
  END IF;
END $$;

-- 5) Partial unique index (only on non-null, non-blank) — idempotent
DROP INDEX IF EXISTS public.uq_instructor_profiles_display_name;
CREATE UNIQUE INDEX IF NOT EXISTS uq_instructor_profiles_display_name
  ON public.instructor_profiles (display_name)
  WHERE display_name IS NOT NULL AND trim(display_name) <> '';

COMMENT ON COLUMN public.instructor_profiles.display_name IS 'Public display name; NULL allowed for draft/incomplete profiles. When set, must not be blank.';

-- =============================================================================
-- instructor_profiles: normalize empty/whitespace to NULL, enforce uniqueness
-- only for non-empty display_name and slug. Idempotent; safe to run multiple times.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) PRE-CHECK QUERIES (run manually before migration for baseline; results as comments)
-- -----------------------------------------------------------------------------
-- Count display_name: NULL vs empty vs whitespace:
--   SELECT
--     count(*) FILTER (WHERE display_name IS NULL) AS display_name_null,
--     count(*) FILTER (WHERE display_name IS NOT NULL AND display_name = '') AS display_name_empty,
--     count(*) FILTER (WHERE display_name IS NOT NULL AND display_name <> '' AND btrim(display_name) = '') AS display_name_whitespace,
--     count(*) FILTER (WHERE display_name IS NOT NULL AND btrim(display_name) <> '') AS display_name_non_empty
--   FROM public.instructor_profiles;
--
-- Count slug: NULL vs empty vs whitespace:
--   SELECT
--     count(*) FILTER (WHERE slug IS NULL) AS slug_null,
--     count(*) FILTER (WHERE slug IS NOT NULL AND slug = '') AS slug_empty,
--     count(*) FILTER (WHERE slug IS NOT NULL AND slug <> '' AND btrim(slug) = '') AS slug_whitespace,
--     count(*) FILTER (WHERE slug IS NOT NULL AND btrim(slug) <> '') AS slug_non_empty
--   FROM public.instructor_profiles;
--
-- Duplicates among normalized non-empty display_name:
--   SELECT btrim(display_name) AS norm, count(*) AS cnt
--   FROM public.instructor_profiles
--   WHERE display_name IS NOT NULL AND btrim(display_name) <> ''
--   GROUP BY btrim(display_name) HAVING count(*) > 1;
--
-- Duplicates among normalized non-empty slug:
--   SELECT btrim(slug) AS norm, count(*) AS cnt
--   FROM public.instructor_profiles
--   WHERE slug IS NOT NULL AND btrim(slug) <> ''
--   GROUP BY btrim(slug) HAVING count(*) > 1;

-- -----------------------------------------------------------------------------
-- B) NORMALIZE DATA: empty and whitespace => NULL
-- -----------------------------------------------------------------------------
UPDATE public.instructor_profiles
SET display_name = NULL
WHERE display_name IS NOT NULL AND btrim(display_name) = '';

UPDATE public.instructor_profiles
SET slug = NULL
WHERE slug IS NOT NULL AND btrim(slug) = '';

-- -----------------------------------------------------------------------------
-- C) DROP DEFAULTS (idempotent: only if default exists)
-- -----------------------------------------------------------------------------
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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instructor_profiles'
      AND column_name = 'slug' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.instructor_profiles ALTER COLUMN slug DROP DEFAULT;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- D) REPLACE INDEXES: drop then create partial unique (non-empty only)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.uq_instructor_profiles_display_name;

CREATE UNIQUE INDEX IF NOT EXISTS uq_instructor_profiles_display_name
  ON public.instructor_profiles (display_name)
  WHERE display_name IS NOT NULL AND btrim(display_name) <> '';

DROP INDEX IF EXISTS public.uq_instructor_profiles_slug;

CREATE UNIQUE INDEX IF NOT EXISTS uq_instructor_profiles_slug
  ON public.instructor_profiles (slug)
  WHERE slug IS NOT NULL AND btrim(slug) <> '';

-- -----------------------------------------------------------------------------
-- E) POST-CHECK QUERIES (run manually after migration to verify; results as comments)
-- -----------------------------------------------------------------------------
-- Remaining duplicates among non-empty display_name (expect 0 rows):
--   SELECT btrim(display_name) AS norm, count(*) AS cnt
--   FROM public.instructor_profiles
--   WHERE display_name IS NOT NULL AND btrim(display_name) <> ''
--   GROUP BY btrim(display_name) HAVING count(*) > 1;
--
-- Remaining duplicates among non-empty slug (expect 0 rows):
--   SELECT btrim(slug) AS norm, count(*) AS cnt
--   FROM public.instructor_profiles
--   WHERE slug IS NOT NULL AND btrim(slug) <> ''
--   GROUP BY btrim(slug) HAVING count(*) > 1;
--
-- Current index definitions:
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE schemaname = 'public' AND tablename = 'instructor_profiles'
--     AND indexname IN ('uq_instructor_profiles_display_name', 'uq_instructor_profiles_slug');

-- 001_instructor_profiles_reconcile (idempotent).
-- 1) Create table if not exists (minimal).
-- 2) Add all columns if missing (safe whether table was just created or already existed with old shape).
-- 3) Set defaults where null.
-- 4) Add constraints if not present.
-- 5) Create indexes (columns exist at this point).

-- 1) Create table if not exists
CREATE TABLE IF NOT EXISTS public.instructor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Reconcile columns (one ALTER; ADD COLUMN IF NOT EXISTS for each)
ALTER TABLE public.instructor_profiles
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS profile_status text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS availability_mode text,
  ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean,
  ADD COLUMN IF NOT EXISTS marketing_fields jsonb,
  ADD COLUMN IF NOT EXISTS operational_fields jsonb,
  ADD COLUMN IF NOT EXISTS pricing_config jsonb,
  ADD COLUMN IF NOT EXISTS ai_config jsonb,
  ADD COLUMN IF NOT EXISTS compliance jsonb,
  ADD COLUMN IF NOT EXISTS approval_status text,
  ADD COLUMN IF NOT EXISTS risk_score integer,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS account_health text,
  ADD COLUMN IF NOT EXISTS fraud_flag boolean;

-- 3) Set defaults where missing (no overwrite of existing values)
UPDATE public.instructor_profiles
SET
  full_name = coalesce(full_name, ''),
  display_name = coalesce(display_name, ''),
  slug = coalesce(slug, ''),
  profile_status = coalesce(profile_status, 'draft'),
  timezone = coalesce(timezone, 'Europe/Rome'),
  availability_mode = coalesce(availability_mode, 'manual'),
  calendar_sync_enabled = coalesce(calendar_sync_enabled, false),
  marketing_fields = coalesce(marketing_fields, '{}'::jsonb),
  operational_fields = coalesce(operational_fields, '{}'::jsonb),
  pricing_config = coalesce(pricing_config, '{}'::jsonb),
  ai_config = coalesce(ai_config, '{}'::jsonb),
  compliance = coalesce(compliance, '{}'::jsonb),
  approval_status = coalesce(approval_status, 'pending'),
  risk_score = coalesce(risk_score, 0),
  account_health = coalesce(account_health, 'ok'),
  fraud_flag = coalesce(fraud_flag, false)
WHERE
  full_name IS NULL
  OR display_name IS NULL
  OR slug IS NULL
  OR profile_status IS NULL
  OR timezone IS NULL
  OR availability_mode IS NULL
  OR calendar_sync_enabled IS NULL
  OR marketing_fields IS NULL
  OR operational_fields IS NULL
  OR pricing_config IS NULL
  OR ai_config IS NULL
  OR compliance IS NULL
  OR approval_status IS NULL
  OR risk_score IS NULL
  OR account_health IS NULL
  OR fraud_flag IS NULL;

-- 4) Constraints (only if not present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_instructor_profiles_status') THEN
    ALTER TABLE public.instructor_profiles
      ADD CONSTRAINT chk_instructor_profiles_status
      CHECK (profile_status IN ('draft','active','suspended'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_instructor_profiles_av_mode') THEN
    ALTER TABLE public.instructor_profiles
      ADD CONSTRAINT chk_instructor_profiles_av_mode
      CHECK (availability_mode IN ('manual','gcal_sync','hybrid'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_instructor_profiles_approval') THEN
    ALTER TABLE public.instructor_profiles
      ADD CONSTRAINT chk_instructor_profiles_approval
      CHECK (approval_status IN ('pending','approved','rejected'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_instructor_profiles_health') THEN
    ALTER TABLE public.instructor_profiles
      ADD CONSTRAINT chk_instructor_profiles_health
      CHECK (account_health IN ('ok','watch','restricted'));
  END IF;
END $$;

-- 5) Indexes (columns exist after step 2)
-- Partial unique on slug/display_name so multiple empty strings don't violate
CREATE UNIQUE INDEX IF NOT EXISTS uq_instructor_profiles_slug
  ON public.instructor_profiles (slug) WHERE slug IS NOT NULL AND slug <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_instructor_profiles_display_name
  ON public.instructor_profiles (display_name) WHERE display_name IS NOT NULL AND display_name <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_profiles_user_id
  ON public.instructor_profiles (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_status ON public.instructor_profiles (profile_status);
CREATE INDEX IF NOT EXISTS idx_instructor_profiles_approval ON public.instructor_profiles (approval_status);

CREATE INDEX IF NOT EXISTS gin_instructor_profiles_marketing ON public.instructor_profiles USING gin (marketing_fields);
CREATE INDEX IF NOT EXISTS gin_instructor_profiles_operational ON public.instructor_profiles USING gin (operational_fields);
CREATE INDEX IF NOT EXISTS gin_instructor_profiles_ai ON public.instructor_profiles USING gin (ai_config);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_instructor_profiles_updated_at') THEN
    CREATE TRIGGER trg_instructor_profiles_updated_at
    BEFORE UPDATE ON public.instructor_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

COMMENT ON TABLE public.instructor_profiles IS 'Instructor profile (reconciled). user_id = auth.users.id for lookup.';

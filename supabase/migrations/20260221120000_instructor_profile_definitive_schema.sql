-- Definitive instructor profile schema (additive, idempotent).
-- Adds JSONB sections and new tables: instructor_assets, instructor_ai_config_versions, booking_policy_snapshots.
-- Aligns instructor_reviews with spec (title, body, reviewer_name, occurred_at).
-- Keeps user_id as canonical auth link; does not change PK.

-- 1) instructor_profiles: add slug, availability_mode, calendar_sync_enabled, JSONB sections, internal flags
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    -- slug (unique)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'slug') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN slug TEXT NULL;
    END IF;
    -- profile_status: use existing "status" if same semantics; add if missing (already have status from 20260220120000)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'availability_mode') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN availability_mode TEXT NOT NULL DEFAULT 'manual' CHECK (availability_mode IN ('manual','gcal_sync','hybrid'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'calendar_sync_enabled') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN calendar_sync_enabled BOOLEAN NOT NULL DEFAULT false;
    END IF;
    -- JSONB sections
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'marketing_fields') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN marketing_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'operational_fields') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN operational_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'pricing_config') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN pricing_config JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'ai_config') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN ai_config JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'compliance') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN compliance JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    -- internal flags (admin)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'risk_score') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN risk_score INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'internal_notes') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN internal_notes TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'account_health') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN account_health TEXT NOT NULL DEFAULT 'ok' CHECK (account_health IN ('ok','watch','restricted'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'fraud_flag') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN fraud_flag BOOLEAN NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;

-- Unique index on slug (only if column exists and index not present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_instructor_profiles_slug ON public.instructor_profiles (slug) WHERE slug IS NOT NULL;

-- GIN indexes for JSONB (idempotent)
CREATE INDEX IF NOT EXISTS gin_instructor_profiles_marketing ON public.instructor_profiles USING gin (marketing_fields);
CREATE INDEX IF NOT EXISTS gin_instructor_profiles_operational ON public.instructor_profiles USING gin (operational_fields);
CREATE INDEX IF NOT EXISTS gin_instructor_profiles_ai ON public.instructor_profiles USING gin (ai_config);

-- Ensure updated_at trigger exists
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

-- 2) instructor_assets (media/documents)
CREATE TABLE IF NOT EXISTS public.instructor_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('profile_photo','whatsapp_photo','gallery','license_scan','insurance_pdf','other')),
  storage_path TEXT NOT NULL,
  mime_type TEXT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instructor_assets_instructor ON public.instructor_assets (instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_assets_kind ON public.instructor_assets (kind);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'instructor_assets' AND constraint_name = 'fk_instructor_assets_instructor') THEN
      ALTER TABLE public.instructor_assets
        ADD CONSTRAINT fk_instructor_assets_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 3) instructor_reviews: add title, body, reviewer_name, occurred_at (align with spec)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_reviews') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_reviews' AND column_name = 'title') THEN
      ALTER TABLE public.instructor_reviews ADD COLUMN title TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_reviews' AND column_name = 'body') THEN
      ALTER TABLE public.instructor_reviews ADD COLUMN body TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_reviews' AND column_name = 'reviewer_name') THEN
      ALTER TABLE public.instructor_reviews ADD COLUMN reviewer_name TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_reviews' AND column_name = 'occurred_at') THEN
      ALTER TABLE public.instructor_reviews ADD COLUMN occurred_at DATE NULL;
    END IF;
  END IF;
END $$;

-- 4) instructor_ai_config_versions (audit of ai_config changes)
CREATE TABLE IF NOT EXISTS public.instructor_ai_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  ai_config JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_cfg_versions_instructor ON public.instructor_ai_config_versions (instructor_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'instructor_ai_config_versions' AND constraint_name = 'fk_ai_cfg_versions_instructor') THEN
      ALTER TABLE public.instructor_ai_config_versions
        ADD CONSTRAINT fk_ai_cfg_versions_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 5) booking_policy_snapshots (source of truth at booking time)
CREATE TABLE IF NOT EXISTS public.booking_policy_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  instructor_id UUID NOT NULL,
  policy_version_id UUID NULL,
  policy_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_policy_booking ON public.booking_policy_snapshots (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_policy_instructor ON public.booking_policy_snapshots (instructor_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'booking_policy_snapshots' AND constraint_name = 'fk_booking_policy_booking') THEN
      ALTER TABLE public.booking_policy_snapshots
        ADD CONSTRAINT fk_booking_policy_booking FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'booking_policy_snapshots' AND constraint_name = 'fk_booking_policy_instructor') THEN
      ALTER TABLE public.booking_policy_snapshots
        ADD CONSTRAINT fk_booking_policy_instructor FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.instructor_assets IS 'Media and documents per instructor (profile photo, gallery, license, insurance).';
COMMENT ON TABLE public.instructor_ai_config_versions IS 'Audit trail of ai_config changes per instructor.';
COMMENT ON TABLE public.booking_policy_snapshots IS 'Frozen policy snapshot at booking creation; source of truth for that booking.';

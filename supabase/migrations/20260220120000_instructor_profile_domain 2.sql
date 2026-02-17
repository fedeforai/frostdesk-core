-- Instructor Profile domain: identity, status, metadata (idempotent).
-- Ensures profile is tied to Supabase user_id; instructor_id = profile.id used everywhere.
-- Additive only; no renames. RLS-friendly (instructor_id / org_id on every row).

-- 1) Enums for instructor_profiles.status and reuse
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'instructor_profile_status') THEN
    CREATE TYPE public.instructor_profile_status AS ENUM ('draft', 'active', 'suspended');
  END IF;
END $$;

-- 2) instructor_profiles: add user_id (Supabase auth), org_id, status, display_name, timezone, phone, languages, resorts, certifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    -- user_id: canonical link to auth.users(id). Lookup by user_id → instructor_id = id.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'user_id') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN user_id UUID NULL;
      UPDATE public.instructor_profiles SET user_id = id WHERE user_id IS NULL;
      ALTER TABLE public.instructor_profiles ALTER COLUMN user_id SET NOT NULL;
    END IF;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_profiles_user_id ON public.instructor_profiles (user_id);
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'org_id') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN org_id UUID NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'status') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'suspended'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'display_name') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'timezone') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'phone') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN phone TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'languages') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN languages TEXT[] NOT NULL DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'resorts') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN resorts JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'certifications') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN certifications JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;
  END IF;
END $$;

COMMENT ON COLUMN public.instructor_profiles.user_id IS 'Supabase auth.users.id; stable mapping user_id → instructor_id (id).';
COMMENT ON COLUMN public.instructor_profiles.org_id IS 'Optional org for multi-tenant; RLS scope.';
COMMENT ON COLUMN public.instructor_profiles.resorts IS 'Resort affiliations; JSONB array for flexibility (no separate table).';

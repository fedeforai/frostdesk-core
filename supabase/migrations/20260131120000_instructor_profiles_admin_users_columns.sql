-- Schema alignment: add missing columns for instructor_profiles and admin_users.
-- Identity: auth.users is canonical; instructor_profiles.id and admin_users.user_id reference auth.users(id).

-- 1) instructor_profiles: add onboarding and status columns if missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'onboarding_completed_at') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN onboarding_completed_at timestamptz NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'approval_status') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN approval_status text NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_profiles' AND column_name = 'onboarding_status') THEN
      ALTER TABLE public.instructor_profiles ADD COLUMN onboarding_status text NULL;
    END IF;
  END IF;
END $$;

-- 2) admin_users: add role column if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'role') THEN
    ALTER TABLE public.admin_users ADD COLUMN role text NOT NULL DEFAULT 'admin';
  END IF;
END $$;

-- 3) admin_users: unique index on (user_id) if missing (PK already implies uniqueness; index ensures explicit constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users (user_id);

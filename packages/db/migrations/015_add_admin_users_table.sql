-- Admin access: list of auth user IDs who can use /admin/* routes.
-- Add a row here to grant admin (use auth.users.id / User UID from Supabase Dashboard).
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_users IS 'Users allowed to access admin app and confirm instructors. user_id = auth.users.id (Supabase User UID).';

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read for service role and API" ON public.admin_users;
CREATE POLICY "Allow read for service role and API"
  ON public.admin_users FOR SELECT
  USING (true);

-- Enable RLS (safe if already enabled)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy for authenticated users to read only their own row
DO $$
BEGIN
  CREATE POLICY "admin_users_select_own_row"
    ON public.admin_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

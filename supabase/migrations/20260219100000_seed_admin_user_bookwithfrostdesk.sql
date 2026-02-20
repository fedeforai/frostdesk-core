-- Grant admin access to bookwithfrostdesk@gmail.com (user_id from Supabase Auth).
-- Idempotent: safe to run multiple times.
INSERT INTO public.admin_users (user_id, role)
VALUES ('59a7c6d1-cfdc-40d6-b509-56d53c213477'::uuid, 'admin')
ON CONFLICT (user_id) DO NOTHING;

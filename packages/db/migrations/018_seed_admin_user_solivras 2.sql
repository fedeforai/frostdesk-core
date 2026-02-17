-- Grant admin access to solivras@gmail.com (user_id from Supabase Auth).
-- Idempotent: safe to run multiple times.
INSERT INTO public.admin_users (user_id)
VALUES ('34afed67-021a-4c18-b33c-8ae69ec1509a'::uuid)
ON CONFLICT (user_id) DO NOTHING;

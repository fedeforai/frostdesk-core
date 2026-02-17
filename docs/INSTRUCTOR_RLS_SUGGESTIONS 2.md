# RLS policy suggestions (instructor domain)

Design for RLS: every row is scoped by `instructor_id` and/or `org_id`. Not mandatory to enable RLS on these tables until multi-tenant; when enabled, use the following patterns.

- **instructor_profiles**: `auth.uid() = user_id` for SELECT/UPDATE (instructor sees own profile). Admin: separate policy via `admin_users` or service role.
- **instructor_services**: `auth.uid() = (SELECT user_id FROM instructor_profiles WHERE id = instructor_services.instructor_id)` or use `instructor_id IN (SELECT id FROM instructor_profiles WHERE user_id = auth.uid())`.
- **instructor_availability**, **instructor_availability_overrides**: same as services (scope by instructor_id → user_id).
- **instructor_reviews**: read by owner: same instructor_id → user_id; write by service role or admin.
- **instructor_ai_config**: `auth.uid() = (SELECT user_id FROM instructor_profiles WHERE id = instructor_ai_config.instructor_id)`.
- **calendar_connections**, **external_busy_blocks**: scope by instructor_id → user_id; never expose tokens to client.
- **audit_logs**: read by org_id or actor_user_id; write only via service role (no client inserts).

When using Supabase client from the app, ensure JWT includes the same `sub` as `auth.users.id` so `auth.uid()` matches. Internal API uses service role or anon with server-side checks; RLS can be additive later.

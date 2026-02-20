-- Ensure audit_log exists with canonical schema (actor_type, etc.) for AI state audit and decision timeline.
-- Idempotent: creates table if missing; adds missing columns if table exists with old schema.

-- 1) Create table if not exists (full schema expected by audit_log_repository)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_type TEXT NOT NULL,
  actor_id TEXT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  request_id TEXT NULL,
  ip TEXT NULL,
  user_agent TEXT NULL,
  payload JSONB NULL
);

-- 2) If table already existed with different schema, add missing columns
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'system';
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_id TEXT NULL;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '';
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT '';
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS entity_id TEXT NULL;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info';
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS request_id TEXT NULL;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS ip TEXT NULL;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT NULL;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS payload JSONB NULL;

-- Drop defaults added for backfill so new inserts must provide values (optional, keeps schema strict)
-- ALTER TABLE public.audit_log ALTER COLUMN actor_type DROP DEFAULT;
-- ALTER TABLE public.audit_log ALTER COLUMN action DROP DEFAULT;
-- ALTER TABLE public.audit_log ALTER COLUMN entity_type DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type_entity_id ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_desc ON public.audit_log (created_at DESC);

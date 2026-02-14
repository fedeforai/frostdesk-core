-- Feature flags table: aligned with packages/db feature_flag_repository (key, env, tenant_id).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT NOT NULL,
  env TEXT NOT NULL CHECK (env IN ('dev', 'staging', 'prod')),
  tenant_id UUID NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, env, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_lookup
  ON public.feature_flags (key, env, tenant_id);

COMMENT ON TABLE public.feature_flags IS 'Feature flags by key, env and optional tenant. Resolution: tenant-specific then (key, env, global sentinel) then default false.';

-- Global flags use sentinel UUID (PK cannot be NULL). Repo treats this as "global".
-- Sentinel: 00000000-0000-0000-0000-000000000000
INSERT INTO public.feature_flags (key, env, tenant_id, enabled, updated_at)
VALUES
  ('ai_enabled', 'dev', '00000000-0000-0000-0000-000000000000'::uuid, false, NOW()),
  ('ai_enabled', 'staging', '00000000-0000-0000-0000-000000000000'::uuid, false, NOW()),
  ('ai_enabled', 'prod', '00000000-0000-0000-0000-000000000000'::uuid, false, NOW()),
  ('ai_whatsapp_enabled', 'dev', '00000000-0000-0000-0000-000000000000'::uuid, false, NOW()),
  ('ai_whatsapp_enabled', 'staging', '00000000-0000-0000-0000-000000000000'::uuid, false, NOW()),
  ('ai_whatsapp_enabled', 'prod', '00000000-0000-0000-0000-000000000000'::uuid, false, NOW())
ON CONFLICT (key, env, tenant_id) DO NOTHING;

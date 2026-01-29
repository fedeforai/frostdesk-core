-- TASK 15.1.1 — Feature Flags Table
-- RALPH-SAFE: schema only, no side effects

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT NOT NULL,
  env TEXT NOT NULL CHECK (env IN ('dev', 'staging', 'prod')),
  tenant_id UUID,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (key, env, tenant_id)
);

-- Optional but recommended index for lookup speed
CREATE INDEX IF NOT EXISTS idx_feature_flags_lookup
  ON feature_flags (key, env, tenant_id);

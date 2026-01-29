-- TASK 20.1.1.1 — AI Feature Flags (DB)
-- RALPH-SAFE: schema only, no side effects

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data (INSERT IF NOT EXISTS)
INSERT INTO feature_flags (key, enabled, created_at, updated_at)
VALUES 
  ('ai_enabled', false, NOW(), NOW()),
  ('ai_whatsapp_enabled', false, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

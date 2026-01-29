-- TASK 20.1.3.1 — AI Quota Counters Table
-- RALPH-SAFE: schema only, no side effects

CREATE TABLE IF NOT EXISTS ai_channel_quotas (
  channel TEXT NOT NULL,
  period DATE NOT NULL,
  max_allowed INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel, period),
  CHECK (used >= 0),
  CHECK (max_allowed >= 0)
);

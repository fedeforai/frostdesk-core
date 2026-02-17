-- Loop B: AI usage telemetry. Append-only. Zero impact on core tables.
CREATE TABLE IF NOT EXISTS ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  instructor_id UUID NULL,
  conversation_id UUID NULL,
  task_type TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  cost_estimate_cents INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  timed_out BOOLEAN NOT NULL DEFAULT false,
  error_code TEXT NULL,
  request_id TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_instructor_time
  ON ai_usage_events (instructor_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at
  ON ai_usage_events (created_at);

COMMENT ON TABLE ai_usage_events IS 'Append-only AI call telemetry: cost, tokens, latency, errors. Loop B.';

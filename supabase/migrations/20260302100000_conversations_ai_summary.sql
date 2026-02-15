-- Rolling AI summary for token control (Loop D / Ralph-safe).
-- Additive only. No backfill needed. Existing rows get NULL summary.
-- Summary is used only for suggestions — audit + message history remain untouched.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_json JSONB NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_message_id UUID NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_version INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.conversations.ai_summary
  IS 'Compact rolling text summary (max ~120 tokens). Used in LLM prompt window.';
COMMENT ON COLUMN public.conversations.ai_summary_json
  IS 'Structured JSON summary: intent, facts_collected, facts_missing, stage, constraints.';
COMMENT ON COLUMN public.conversations.ai_summary_version
  IS 'Monotonic counter. Incremented each time summary is regenerated.';

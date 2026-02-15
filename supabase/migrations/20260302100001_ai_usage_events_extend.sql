-- Extend ai_usage_events with columns needed for cost dashboard.
-- Additive only. Existing rows get safe defaults.

ALTER TABLE public.ai_usage_events
  ADD COLUMN IF NOT EXISTS message_id UUID NULL,
  ADD COLUMN IF NOT EXISTS success BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Extra indexes for cost dashboard queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_conversation_time
  ON ai_usage_events (conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_usage_task_type_time
  ON ai_usage_events (task_type, created_at DESC);

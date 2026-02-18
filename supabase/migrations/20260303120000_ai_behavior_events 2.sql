-- AI behavior events: instructor actions (e.g. toggle AI/WhatsApp) for tracking and adoption metrics.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.ai_behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_behavior_events_instructor_id
  ON public.ai_behavior_events (instructor_id);

CREATE INDEX IF NOT EXISTS idx_ai_behavior_events_created_at
  ON public.ai_behavior_events (created_at);

CREATE INDEX IF NOT EXISTS idx_ai_behavior_events_action
  ON public.ai_behavior_events (action);

COMMENT ON TABLE public.ai_behavior_events IS 'Instructor AI-related actions (e.g. toggles) for adoption and analytics. Append-only.';

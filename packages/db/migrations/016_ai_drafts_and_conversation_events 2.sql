-- STEP 4.1 Loop 1: ai_drafts + conversation_events (no FK to avoid break; add later if needed)

-- ai_drafts: one active proposed draft per (conversation_id, instructor_id)
CREATE TABLE IF NOT EXISTS public.ai_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  instructor_id uuid NOT NULL,
  state text NOT NULL CHECK (state IN ('proposed', 'used', 'ignored', 'expired')),
  draft_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz NULL,
  ignored_at timestamptz NULL,
  expires_at timestamptz NULL,
  last_event_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_conversation ON public.ai_drafts (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_instructor_state_created ON public.ai_drafts (instructor_id, state, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ai_drafts_one_proposed
  ON public.ai_drafts (conversation_id, instructor_id)
  WHERE state = 'proposed';

-- instructor_draft_events: audit trail for draft lifecycle and KPIs
-- (distinct from existing conversation_events table which has different schema)
CREATE TABLE IF NOT EXISTS public.instructor_draft_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  instructor_id uuid NOT NULL,
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'api',
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_instructor_draft_events_conversation_created ON public.instructor_draft_events (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_draft_events_instructor_type_created ON public.instructor_draft_events (instructor_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instructor_draft_events_created ON public.instructor_draft_events (created_at DESC);

-- Nome intuitivo per prodotto: draft_events punta a instructor_draft_events (conversation_events è legacy)
CREATE OR REPLACE VIEW public.draft_events AS
SELECT id, conversation_id, instructor_id, event_type, source, created_at, payload
FROM public.instructor_draft_events;

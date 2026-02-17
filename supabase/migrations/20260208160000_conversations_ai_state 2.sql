-- Loop 3: AI conversation state machine (additive only).
-- Source: docs/diagrams/AI_STATE_MACHINE.mmd
-- No backfill, no rename, no drop. Default ai_state = ai_on.

BEGIN;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS ai_state TEXT NOT NULL DEFAULT 'ai_on';

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_ai_state_check;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_ai_state_check
  CHECK (ai_state IN ('ai_on', 'ai_paused_by_human', 'ai_suggestion_only'));

COMMIT;

-- Loop 5: Handoff & Referrals (additive only).
-- instructor_referrals = configuration (trusted peers).
-- conversation_handoffs = event log (append-only).

BEGIN;

-- Instructor referrals: unidirectional trust (instructor_id -> referred_instructor_id)
CREATE TABLE IF NOT EXISTS public.instructor_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  referred_instructor_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_instructor_referrals_instructor_id
  ON public.instructor_referrals (instructor_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_referrals_pair
  ON public.instructor_referrals (instructor_id, referred_instructor_id);

-- Conversation handoffs: event log (append-only, never updated/deleted)
CREATE TABLE IF NOT EXISTS public.conversation_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  from_instructor_id UUID NOT NULL,
  to_instructor_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_conversation_handoffs_conversation_id
  ON public.conversation_handoffs (conversation_id);

COMMIT;

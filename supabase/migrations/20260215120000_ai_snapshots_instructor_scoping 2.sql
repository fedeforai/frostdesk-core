-- AI snapshots instructor scoping: add instructor_id, backfill, index, composite FK.
-- Idempotent: safe to run multiple times.
-- instructor_id left nullable; NOT NULL can be added later after verifying no NULLs.

-- a) conversations: unique on (id, instructor_id) for composite FK target
CREATE UNIQUE INDEX IF NOT EXISTS conversations_id_instructor_id_uq
  ON public.conversations (id, instructor_id);

-- b) ai_snapshots: add column, backfill, index
ALTER TABLE public.ai_snapshots
  ADD COLUMN IF NOT EXISTS instructor_id uuid NULL;

UPDATE public.ai_snapshots s
SET instructor_id = c.instructor_id
FROM public.conversations c
WHERE c.id = s.conversation_id
  AND s.instructor_id IS NULL;

CREATE INDEX IF NOT EXISTS ai_snapshots_conv_instr_idx
  ON public.ai_snapshots (conversation_id, instructor_id);

-- c) composite FK anti-leakage: CASCADE so conversation delete removes snapshots (SET NULL would fail when conversation_id is NOT NULL)
ALTER TABLE public.ai_snapshots
  DROP CONSTRAINT IF EXISTS ai_snapshots_conversation_instructor_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_snapshots_conversation_instructor_fkey'
      AND conrelid = 'public.ai_snapshots'::regclass
  ) THEN
    ALTER TABLE public.ai_snapshots
      ADD CONSTRAINT ai_snapshots_conversation_instructor_fkey
      FOREIGN KEY (conversation_id, instructor_id)
      REFERENCES public.conversations (id, instructor_id)
      ON DELETE CASCADE;
  END IF;
END
$$;

-- Follow-up: set ai_snapshots.instructor_id NOT NULL after backfill is verified.
-- Run only after 20260215120000_ai_snapshots_instructor_scoping.sql has been applied
-- and no NULL instructor_id rows remain (backfill + insertAISnapshot now requires conversation to exist).

-- Ensure no NULLs remain before adding constraint
UPDATE public.ai_snapshots s
SET instructor_id = c.instructor_id
FROM public.conversations c
WHERE c.id = s.conversation_id
  AND s.instructor_id IS NULL;

-- Enforce NOT NULL so instructor-scoped reads can rely on column
ALTER TABLE public.ai_snapshots
  ALTER COLUMN instructor_id SET NOT NULL;

-- Instructor policy document: one row per instructor (structured jsonb + freeform text, versioned).
-- Source of truth for GET/PATCH /instructor/policies. Idempotent.

CREATE TABLE IF NOT EXISTS public.instructor_policy_document (
  instructor_id UUID PRIMARY KEY,
  structured JSONB NOT NULL DEFAULT '{}'::jsonb,
  freeform TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  updated_by UUID NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructor_policy_document_updated_at
  ON public.instructor_policy_document (updated_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'instructor_policy_document' AND constraint_name = 'fk_instructor_policy_document_instructor'
    ) THEN
      ALTER TABLE public.instructor_policy_document
        ADD CONSTRAINT fk_instructor_policy_document_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.instructor_policy_document IS 'One row per instructor: structured policy fields (jsonb) + freeform text, version for optimistic lock.';

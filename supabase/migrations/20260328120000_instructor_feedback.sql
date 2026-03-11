-- Instructor feedback: messages from instructors visible only to admin (developer inbox).
-- Instructor can create and list own messages; admin can list by instructor_id and update read_at / admin_notes.
CREATE TABLE IF NOT EXISTS public.instructor_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.instructor_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS ix_instructor_feedback_instructor_id
  ON public.instructor_feedback (instructor_id);
CREATE INDEX IF NOT EXISTS ix_instructor_feedback_instructor_created
  ON public.instructor_feedback (instructor_id, created_at DESC);

COMMENT ON TABLE public.instructor_feedback IS 'Feedback/notes from instructors to the team. Visible only in admin; instructor can create and list own.';

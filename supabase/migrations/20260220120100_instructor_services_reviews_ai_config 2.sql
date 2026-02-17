-- Instructor services (extend), instructor_reviews, instructor_ai_config (idempotent).

-- 1) instructor_services: add sport, lesson_type, min/max_participants, base_price, rules (keep existing columns)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_services') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_services' AND column_name = 'sport') THEN
      ALTER TABLE public.instructor_services ADD COLUMN sport TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_services' AND column_name = 'lesson_type') THEN
      ALTER TABLE public.instructor_services ADD COLUMN lesson_type TEXT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_services' AND column_name = 'min_participants') THEN
      ALTER TABLE public.instructor_services ADD COLUMN min_participants INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_services' AND column_name = 'max_participants') THEN
      ALTER TABLE public.instructor_services ADD COLUMN max_participants INTEGER NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_services' AND column_name = 'base_price') THEN
      ALTER TABLE public.instructor_services ADD COLUMN base_price NUMERIC(10,2) NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instructor_services' AND column_name = 'rules') THEN
      ALTER TABLE public.instructor_services ADD COLUMN rules JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_instructor_services_instructor_active
  ON public.instructor_services (instructor_id, is_active) WHERE is_active = true;

-- 2) instructor_reviews (internal reputation; NOT public)
CREATE TABLE IF NOT EXISTS public.instructor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  booking_id UUID NULL,
  source TEXT NOT NULL DEFAULT 'internal',
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instructor_reviews_instructor_id ON public.instructor_reviews (instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_reviews_booking_id ON public.instructor_reviews (booking_id) WHERE booking_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'instructor_reviews' AND constraint_name = 'fk_instructor_reviews_instructor') THEN
      ALTER TABLE public.instructor_reviews
        ADD CONSTRAINT fk_instructor_reviews_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 3) instructor_ai_config (one row per instructor; automation + guardrails)
CREATE TABLE IF NOT EXISTS public.instructor_ai_config (
  instructor_id UUID PRIMARY KEY,
  automation_enabled BOOLEAN NOT NULL DEFAULT true,
  escalation_mode TEXT NOT NULL DEFAULT 'on_risk' CHECK (escalation_mode IN ('never', 'on_risk', 'always')),
  max_daily_hours NUMERIC(4,2) NULL,
  preferred_gap_minutes INTEGER NULL,
  last_minute_threshold_hours NUMERIC(4,2) NULL,
  tone_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  safety_policies JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instructor_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'instructor_ai_config' AND constraint_name = 'fk_instructor_ai_config_instructor') THEN
      ALTER TABLE public.instructor_ai_config
        ADD CONSTRAINT fk_instructor_ai_config_instructor
        FOREIGN KEY (instructor_id) REFERENCES public.instructor_profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.instructor_reviews IS 'Internal reputation signals only; not customer-facing.';
COMMENT ON TABLE public.instructor_ai_config IS 'AI automation and guardrails per instructor.';

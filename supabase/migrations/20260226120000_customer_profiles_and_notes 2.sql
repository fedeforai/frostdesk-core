-- Customer profiles: one per (instructor, phone). Display label from display_name or masked phone.
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  phone_number TEXT,
  display_name TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'web', 'referral', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_customer_profiles_instructor_phone
    UNIQUE NULLS NOT DISTINCT (instructor_id, phone_number)
);

CREATE INDEX IF NOT EXISTS ix_customer_profiles_instructor_id
  ON public.customer_profiles (instructor_id);
CREATE INDEX IF NOT EXISTS ix_customer_profiles_last_seen
  ON public.customer_profiles (last_seen_at DESC);

COMMENT ON TABLE public.customer_profiles IS 'Customers scoped to instructor. Identity by phone_number (E.164); display_name optional.';

-- Customer notes: human/operational memory per customer. Ownership by instructor_id.
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_customer_notes_customer_id
  ON public.customer_notes (customer_id);
CREATE INDEX IF NOT EXISTS ix_customer_notes_instructor_id
  ON public.customer_notes (instructor_id);

COMMENT ON TABLE public.customer_notes IS 'Notes on a customer. Enforce customer belongs to instructor when inserting.';

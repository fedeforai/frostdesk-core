-- instructor_whatsapp_accounts: one WhatsApp number per instructor (multi-tenant inbox).
-- phone_number_id is Meta's ID for the business phone number; used to route
-- inbound webhook messages to the correct instructor.
-- Auto-association: when phone_number_id is NULL but phone_number matches the
-- webhook's display_phone_number, the webhook sets phone_number_id automatically.

CREATE TABLE IF NOT EXISTS public.instructor_whatsapp_accounts (
  instructor_id UUID PRIMARY KEY REFERENCES public.instructor_profiles(id),
  phone_number  TEXT NOT NULL,
  phone_number_id TEXT UNIQUE NULL,
  provider      TEXT NOT NULL DEFAULT 'whatsapp_business',
  status        TEXT NOT NULL DEFAULT 'pending',
  connected_at  TIMESTAMPTZ NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If table already exists (from code-level CREATE), add the new column
ALTER TABLE public.instructor_whatsapp_accounts
  ADD COLUMN IF NOT EXISTS phone_number_id TEXT UNIQUE NULL;

-- Index for auto-association lookup: find by normalized phone_number where phone_number_id is NULL
CREATE INDEX IF NOT EXISTS idx_iwa_phone_number
  ON public.instructor_whatsapp_accounts (phone_number)
  WHERE phone_number_id IS NULL;

-- Index for webhook routing: find instructor by phone_number_id
CREATE INDEX IF NOT EXISTS idx_iwa_phone_number_id
  ON public.instructor_whatsapp_accounts (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

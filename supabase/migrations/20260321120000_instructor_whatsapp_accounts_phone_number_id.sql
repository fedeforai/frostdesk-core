-- Multi-tenant WhatsApp: one number per instructor.
-- Creates instructor_whatsapp_accounts if missing; adds phone_number_id and waba_id for Meta lookup.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.instructor_whatsapp_accounts (
  instructor_id UUID PRIMARY KEY REFERENCES public.instructor_profiles(id) ON DELETE CASCADE,
  phone_number TEXT,
  provider TEXT NOT NULL DEFAULT 'whatsapp_business',
  status TEXT NOT NULL DEFAULT 'pending',
  connected_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add Meta Cloud API identifiers (for webhook routing and outbound send)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instructor_whatsapp_accounts' AND column_name = 'phone_number_id'
  ) THEN
    ALTER TABLE public.instructor_whatsapp_accounts ADD COLUMN phone_number_id TEXT NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'instructor_whatsapp_accounts' AND column_name = 'waba_id'
  ) THEN
    ALTER TABLE public.instructor_whatsapp_accounts ADD COLUMN waba_id TEXT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_whatsapp_accounts_phone_number_id
  ON public.instructor_whatsapp_accounts (phone_number_id)
  WHERE phone_number_id IS NOT NULL;

COMMENT ON COLUMN public.instructor_whatsapp_accounts.phone_number_id IS 'Meta WhatsApp Cloud API phone_number_id; used by webhook to resolve instructor and for outbound send.';
COMMENT ON COLUMN public.instructor_whatsapp_accounts.waba_id IS 'Meta WhatsApp Business Account ID (optional).';

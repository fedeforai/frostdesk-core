-- Multi-tenant WhatsApp: support webhook auto-association by display_phone_number.
-- Index for lookup "find instructor by phone_number where phone_number_id IS NULL" (first message on that number).
-- Idempotent: safe to re-run.

COMMENT ON COLUMN public.instructor_whatsapp_accounts.phone_number IS
  'E.164 preferred; used by webhook to match display_phone_number and auto-set phone_number_id on first message.';

CREATE INDEX IF NOT EXISTS idx_instructor_whatsapp_accounts_phone_number_null_phone_number_id
  ON public.instructor_whatsapp_accounts (phone_number)
  WHERE phone_number_id IS NULL AND phone_number IS NOT NULL;

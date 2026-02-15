-- CM-2: Link conversations to customer_profiles.
-- Additive migration: nullable FK, no breaking change. Legacy rows keep customer_id NULL.
-- Linking happens during message ingestion (webhook_whatsapp).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS customer_id UUID NULL
  REFERENCES public.customer_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_customer_id
  ON public.conversations (customer_id)
  WHERE customer_id IS NOT NULL;

COMMENT ON COLUMN public.conversations.customer_id
  IS 'FK to customer_profiles. Set during ingestion. Legacy rows may be NULL.';

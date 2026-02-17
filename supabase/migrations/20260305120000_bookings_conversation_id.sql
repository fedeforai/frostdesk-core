-- Add conversation_id to bookings for in-conversation context (upcoming bookings per conversation).
-- Additive only. Used by getUpcomingBookingsByConversation and confirm draft flow.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS conversation_id UUID NULL
  REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_conversation_id
  ON public.bookings (conversation_id)
  WHERE conversation_id IS NOT NULL;

COMMENT ON COLUMN public.bookings.conversation_id IS 'Conversation this booking originated from (e.g. AI draft confirm). Enables in-thread cancel/context.';

COMMIT;

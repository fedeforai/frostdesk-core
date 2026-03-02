-- Third-party booking support: request_source and guest_name.
-- ai_booking_drafts: who is requesting (direct | agency | concierge) and guest name when different from booker.
-- bookings: same columns for audit and display when draft is confirmed.

BEGIN;

-- ai_booking_drafts
ALTER TABLE public.ai_booking_drafts
  ADD COLUMN IF NOT EXISTS request_source TEXT NOT NULL DEFAULT 'direct';

ALTER TABLE public.ai_booking_drafts
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

COMMENT ON COLUMN public.ai_booking_drafts.request_source IS 'Origin of the request: direct (customer books for self), agency, concierge.';
COMMENT ON COLUMN public.ai_booking_drafts.guest_name IS 'Name of the guest (lesson participant). Required when request_source is agency or concierge; for direct, may equal customer_name.';

-- bookings (for confirmed bookings created from drafts)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS request_source TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

COMMENT ON COLUMN public.bookings.request_source IS 'Copied from ai_booking_draft at confirm. direct | agency | concierge.';
COMMENT ON COLUMN public.bookings.guest_name IS 'Lesson participant name. From draft guest_name or customer_name.';

COMMIT;

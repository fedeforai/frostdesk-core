-- Loop 0: Booking schema reconciliation (additive only).
-- Aligns public.bookings with columns referenced by:
--   booking_repository.ts, admin_booking_repository.ts, admin_booking_detail_repository.ts,
--   ai_booking_confirm_repository.ts, bookings.ts
-- No behavior change. No status/CHECK/enum changes. No drops or renames.

BEGIN;

-- booking_repository: createBooking, getBookingById, updateBookingState
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_point_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- admin_booking_repository, admin_booking_detail_repository: listAllBookings, getBookingById
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

COMMIT;

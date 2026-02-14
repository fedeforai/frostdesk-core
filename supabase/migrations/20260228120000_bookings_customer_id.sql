-- Bookings must reference an existing customer (customer_profiles).
-- customer_name kept for legacy display. New bookings set customer_id + customer_name from customer.
BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_id UUID NULL
  REFERENCES public.customer_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON public.bookings (customer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_instructor_customer
  ON public.bookings (instructor_id, customer_id);

COMMENT ON COLUMN public.bookings.customer_id IS 'FK to customer_profiles. Required for new bookings; legacy rows may have only customer_name.';

COMMIT;

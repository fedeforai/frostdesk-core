-- Revenue snapshot: persist Stripe amount + currency on bookings.
-- Nullable so existing bookings are unaffected. Populated by webhook on payment.

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS currency TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_paid_at
  ON bookings (paid_at);

CREATE INDEX IF NOT EXISTS idx_bookings_instructor_paid
  ON bookings (instructor_id, paid_at)
  WHERE payment_status = 'paid';

COMMIT;

-- Add 'completed' terminal state to bookings.
-- completed = lesson delivered. Distinct from confirmed (booked) and paid (revenue).

BEGIN;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'draft',
    'pending',
    'confirmed',
    'cancelled',
    'modified',
    'declined',
    'completed'
  ));

COMMIT;

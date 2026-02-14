-- Loop 1: Extend public.bookings.status to allow new states (additive only).
-- Source: docs/diagrams/BOOKING_STATE_MACHINE.mmd
-- Do NOT remove existing allowed values. Do NOT rename proposed→pending. No backfill.

BEGIN;

-- Drop any existing CHECK on public.bookings.status (name may vary)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'public.bookings'::regclass
      AND c.contype = 'c'
      AND a.attname = 'status'
  LOOP
    EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- Add extended constraint: existing (pending, confirmed, cancelled) + new (draft, modified, declined)
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('draft', 'pending', 'confirmed', 'cancelled', 'modified', 'declined'));

COMMIT;

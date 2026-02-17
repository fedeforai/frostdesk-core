-- Create public.bookings if missing (e.g. when remote had migrations reverted).
-- Required before 20260208120000_booking_schema_reconciliation.sql.

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_instructor_id
  ON public.bookings (instructor_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON public.bookings (status);

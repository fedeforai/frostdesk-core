CREATE TABLE IF NOT EXISTS booking_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  event_type TEXT,
  from_status TEXT,
  to_status TEXT,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

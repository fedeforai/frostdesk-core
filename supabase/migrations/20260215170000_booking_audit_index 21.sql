BEGIN;

-- Composite index to optimize funnel KPI query.
-- Enables efficient JOIN on booking_id + time-window filtering on created_at.
-- Eliminates full sequential scan on booking_audit.

CREATE INDEX IF NOT EXISTS idx_booking_audit_booking_created
  ON booking_audit (booking_id, created_at);

COMMIT;

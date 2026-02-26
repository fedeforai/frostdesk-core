-- Add event_type column to audit_log.
-- The audit_log_repository.ts inserts event_type (falls back to action if omitted).
-- Without this column, INSERT fails in production when using audit_log_canonical_schema.
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS event_type TEXT NULL;

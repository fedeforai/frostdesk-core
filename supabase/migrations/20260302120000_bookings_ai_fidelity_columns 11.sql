-- P2.1 T1: Add columns to preserve AI draft fidelity in bookings.
-- Additive only. No drops. No behavior change.
-- These columns store values extracted by AI from the customer's message,
-- transferred at draft → booking confirmation.

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS party_size INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS skill_level TEXT NULL;

COMMENT ON COLUMN public.bookings.duration_minutes IS 'Lesson duration in minutes. Nullable for legacy rows.';
COMMENT ON COLUMN public.bookings.party_size IS 'Number of participants. Defaults to 1.';
COMMENT ON COLUMN public.bookings.skill_level IS 'Participant skill level (e.g. beginner, intermediate, advanced). Nullable.';

COMMIT;

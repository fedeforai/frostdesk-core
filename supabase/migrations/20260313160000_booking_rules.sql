-- Migration: Instructor Booking Rules
-- Allows instructors to define rules for bookings (min duration, advance notice, travel buffers, etc.)

CREATE TABLE IF NOT EXISTS public.instructor_booking_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.instructor_profiles(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'min_duration',
    'advance_booking',
    'max_advance',
    'travel_buffer',
    'gap_protection',
    'daily_limit',
    'weekly_limit',
    'full_week_preference'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  valid_from DATE,
  valid_to DATE,
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.instructor_booking_rules IS 'Instructor-defined booking rules for validation and optimization.';
COMMENT ON COLUMN public.instructor_booking_rules.rule_type IS 'Type of rule: min_duration, advance_booking, max_advance, travel_buffer, gap_protection, daily_limit, weekly_limit, full_week_preference';
COMMENT ON COLUMN public.instructor_booking_rules.config IS 'JSON configuration specific to rule_type';
COMMENT ON COLUMN public.instructor_booking_rules.valid_from IS 'Optional: rule applies only from this date';
COMMENT ON COLUMN public.instructor_booking_rules.valid_to IS 'Optional: rule applies only until this date';
COMMENT ON COLUMN public.instructor_booking_rules.priority IS 'Higher priority rules are evaluated first';

-- Index for fetching rules by instructor
CREATE INDEX IF NOT EXISTS idx_booking_rules_instructor 
  ON public.instructor_booking_rules(instructor_id);

-- Index for fetching active rules with date filtering
CREATE INDEX IF NOT EXISTS idx_booking_rules_active 
  ON public.instructor_booking_rules(instructor_id, is_active, valid_from, valid_to) 
  WHERE is_active;

-- Index for rule type lookups
CREATE INDEX IF NOT EXISTS idx_booking_rules_type
  ON public.instructor_booking_rules(instructor_id, rule_type)
  WHERE is_active;

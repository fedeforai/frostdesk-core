-- Add availability settings to instructor_profiles for Calendly-like slot calculation.
-- buffer_before_minutes: time needed before a booking (e.g., preparation)
-- buffer_after_minutes: time needed after a booking (e.g., travel, notes)
-- min_notice_hours: minimum advance notice required for bookings
-- slot_duration_minutes: default slot duration for availability display

ALTER TABLE instructor_profiles 
ADD COLUMN IF NOT EXISTS buffer_before_minutes INT NOT NULL DEFAULT 0;

ALTER TABLE instructor_profiles 
ADD COLUMN IF NOT EXISTS buffer_after_minutes INT NOT NULL DEFAULT 15;

ALTER TABLE instructor_profiles 
ADD COLUMN IF NOT EXISTS min_notice_hours INT NOT NULL DEFAULT 24;

ALTER TABLE instructor_profiles 
ADD COLUMN IF NOT EXISTS slot_duration_minutes INT NOT NULL DEFAULT 60;

COMMENT ON COLUMN instructor_profiles.buffer_before_minutes IS 'Minutes of buffer required before each booking';
COMMENT ON COLUMN instructor_profiles.buffer_after_minutes IS 'Minutes of buffer required after each booking (e.g., travel time)';
COMMENT ON COLUMN instructor_profiles.min_notice_hours IS 'Minimum hours of advance notice required for bookings';
COMMENT ON COLUMN instructor_profiles.slot_duration_minutes IS 'Default slot duration in minutes for availability calculation';

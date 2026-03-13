-- Migration: Meeting Point Travel Times
-- Stores travel times between meeting points for buffer calculation

CREATE TABLE IF NOT EXISTS public.meeting_point_travel_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.instructor_profiles(id) ON DELETE CASCADE,
  from_meeting_point_id UUID REFERENCES public.meeting_points(id) ON DELETE CASCADE,
  to_meeting_point_id UUID REFERENCES public.meeting_points(id) ON DELETE CASCADE,
  travel_minutes INT NOT NULL CHECK (travel_minutes >= 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_travel_pair 
    UNIQUE (instructor_id, from_meeting_point_id, to_meeting_point_id)
);

COMMENT ON TABLE public.meeting_point_travel_times IS 'Travel times between meeting points for an instructor.';
COMMENT ON COLUMN public.meeting_point_travel_times.from_meeting_point_id IS 'Source meeting point (NULL for default)';
COMMENT ON COLUMN public.meeting_point_travel_times.to_meeting_point_id IS 'Destination meeting point (NULL for default)';
COMMENT ON COLUMN public.meeting_point_travel_times.travel_minutes IS 'Travel time in minutes';
COMMENT ON COLUMN public.meeting_point_travel_times.is_default IS 'If true, this is the default buffer when no specific route is defined';

-- Index for fetching travel times by instructor
CREATE INDEX IF NOT EXISTS idx_travel_times_instructor 
  ON public.meeting_point_travel_times(instructor_id);

-- Index for looking up specific routes
CREATE INDEX IF NOT EXISTS idx_travel_times_route
  ON public.meeting_point_travel_times(instructor_id, from_meeting_point_id, to_meeting_point_id);

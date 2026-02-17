-- Add location (where the activity takes place) to instructor_services.
ALTER TABLE public.instructor_services
  ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.instructor_services.location IS 'Where the activity takes place (e.g. resort name, area, meeting point)';

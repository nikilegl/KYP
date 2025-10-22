-- Add logo column to platforms table
ALTER TABLE public.platforms ADD COLUMN IF NOT EXISTS logo TEXT;

-- Add comment to explain the logo column
COMMENT ON COLUMN public.platforms.logo IS 'Base64 encoded image or SVG text for the platform logo';


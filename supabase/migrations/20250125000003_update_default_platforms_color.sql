-- Update default platform color to #5A6698
UPDATE public.platforms
SET colour = '#5A6698'
WHERE colour = '#3B82F6' OR colour = '#F59E0B';


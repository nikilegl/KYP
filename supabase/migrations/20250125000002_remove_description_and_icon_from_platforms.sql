-- Remove description and icon columns from platforms table
ALTER TABLE public.platforms DROP COLUMN IF EXISTS description;
ALTER TABLE public.platforms DROP COLUMN IF EXISTS icon;


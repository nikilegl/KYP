/*
  # Fix priority_rating column type

  1. Changes
    - Change `priority_rating` column from UUID to TEXT type in user_stories table
    - Add check constraint to ensure only valid priority values are allowed
    - Update any existing data if needed

  2. Security
    - Maintains existing RLS policies on user_stories table
*/

-- First, drop the existing check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_stories_priority_rating_check' 
    AND table_name = 'user_stories'
  ) THEN
    ALTER TABLE user_stories DROP CONSTRAINT user_stories_priority_rating_check;
  END IF;
END $$;

-- Change the column type from UUID to TEXT
ALTER TABLE user_stories 
ALTER COLUMN priority_rating TYPE text 
USING priority_rating::text;

-- Add the check constraint to ensure only valid values
ALTER TABLE user_stories 
ADD CONSTRAINT user_stories_priority_rating_check 
CHECK (priority_rating = ANY (ARRAY['must'::text, 'should'::text, 'could'::text, 'would'::text]));

-- Set default value
ALTER TABLE user_stories 
ALTER COLUMN priority_rating SET DEFAULT 'should'::text;
/*
  # Add layout field to user_journeys table
  
  1. Changes
    - Add layout column to user_journeys table with values 'vertical' or 'horizontal'
    - Default to 'vertical' for existing journeys
*/

-- Add layout column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'layout'
  ) THEN
    ALTER TABLE user_journeys 
    ADD COLUMN layout text DEFAULT 'vertical' CHECK (layout IN ('vertical', 'horizontal'));
  END IF;
END $$;


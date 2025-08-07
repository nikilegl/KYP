/*
  # Add status column to user_stories table

  1. New Columns
    - `status` (text, default 'Not planned')
      - Tracks the current status of a user story
      - Allowed values: 'Not planned', 'Not started', 'Design in progress', 'Design complete', 'Build in progress', 'Released'

  2. Constraints
    - Add check constraint to ensure only valid status values are allowed
    - Set default value to 'Not planned'

  3. Changes
    - Add status column with default value
    - Add check constraint for valid status values
*/

-- Add status column to user_stories table
ALTER TABLE IF EXISTS user_stories 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Not planned';

-- Add check constraint to ensure only valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_stories_status_check' 
    AND table_name = 'user_stories'
  ) THEN
    ALTER TABLE user_stories 
    ADD CONSTRAINT user_stories_status_check 
    CHECK (status IN ('Not planned', 'Not started', 'Design in progress', 'Design complete', 'Build in progress', 'Released'));
  END IF;
END $$;
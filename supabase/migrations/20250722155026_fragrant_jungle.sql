/*
  # Add priority rating to user stories

  1. Changes
    - Add `priority_rating` column to `user_stories` table
    - Set default value to 'should'
    - Add check constraint for valid values

  2. Security
    - No changes to existing RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'priority_rating'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN priority_rating text DEFAULT 'should';
    
    ALTER TABLE user_stories ADD CONSTRAINT user_stories_priority_rating_check 
    CHECK (priority_rating IN ('must', 'should', 'could', 'would'));
  END IF;
END $$;
/*
  # Add reason column to user_stories table

  1. Schema Changes
    - Add `reason` column to `user_stories` table
      - `reason` (text, nullable) - stores the "So that I can" reason for the user story

  2. Notes
    - This field is optional and can be null
    - No default value is set as this is a new optional field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'reason'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN reason text;
  END IF;
END $$;
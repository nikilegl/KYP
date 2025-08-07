/*
  # Add decision_text2 column to user_stories table

  1. Schema Changes
    - Add `decision_text2` column to `user_stories` table
    - Column type: text[] (array of text)
    - Default value: empty array
    - Nullable: true

  2. Purpose
    - Store decision text entries for user stories
    - Support multiple decisions per user story
    - Separate from existing decision_text column for testing
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'decision_text2'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN decision_text2 text[] DEFAULT '{}';
  END IF;
END $$;
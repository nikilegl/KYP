/*
  # Add user assignment to user stories

  1. Schema Changes
    - Add `assigned_to_user_id` column to `user_stories` table
    - Add foreign key constraint to `auth.users` table
    - Add index for performance

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add assigned_to_user_id column to user_stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'assigned_to_user_id'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN assigned_to_user_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_stories_assigned_to_user'
  ) THEN
    ALTER TABLE user_stories
    ADD CONSTRAINT fk_user_stories_assigned_to_user
    FOREIGN KEY (assigned_to_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_stories_assigned_to_user_id'
  ) THEN
    CREATE INDEX idx_user_stories_assigned_to_user_id ON user_stories(assigned_to_user_id);
  END IF;
END $$;
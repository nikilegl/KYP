/*
  # Add user_permission_id column to user_stories table

  1. Schema Changes
    - Add `user_permission_id` column to `user_stories` table
    - Column type: uuid (nullable)
    - Add foreign key constraint to `user_permissions` table

  2. Security
    - No RLS changes needed (inherits from existing table policies)

  3. Notes
    - This column allows user stories to be associated with specific user permissions
    - Nullable to maintain backward compatibility with existing data
*/

-- Add user_permission_id column to user_stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'user_permission_id'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN user_permission_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_stories_user_permission_id_fkey'
  ) THEN
    ALTER TABLE user_stories 
    ADD CONSTRAINT user_stories_user_permission_id_fkey 
    FOREIGN KEY (user_permission_id) REFERENCES user_permissions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better query performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_stories_user_permission_id'
  ) THEN
    CREATE INDEX idx_user_stories_user_permission_id ON user_stories(user_permission_id);
  END IF;
END $$;
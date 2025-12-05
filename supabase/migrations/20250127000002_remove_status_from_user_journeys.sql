/*
  # Remove status column from user_journeys
  
  This migration:
  1. Drops RLS policies that depend on status column
  2. Drops the status CHECK constraint
  3. Removes the status column from user_journeys
  4. Recreates RLS policies without status dependency
  
  User journeys now inherit their status from their parent folder.
  If a journey is in a shared folder, it's shared. If in a personal folder, it's personal.
  Journeys without a folder are considered personal by default.
  
  Note: All journeys can be accessed via public link regardless of folder status.
*/

-- Drop RLS policies that depend on the status column
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;

-- Drop the status CHECK constraint
ALTER TABLE user_journeys
DROP CONSTRAINT IF EXISTS user_journeys_status_check;

-- Remove the status column
ALTER TABLE user_journeys
DROP COLUMN IF EXISTS status;

-- Recreate the policy for anonymous users (all journeys can be accessed via public link)
-- Since journeys can be shared via public link regardless of folder status,
-- we allow anonymous users to read all journeys
CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (true);

-- Update the comment on the table to reflect the new behavior
COMMENT ON TABLE user_journeys IS 'User journeys inherit their status from their parent folder. Journeys in shared folders are shared, journeys in personal folders are personal. All journeys can be accessed via public link.';


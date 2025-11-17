/*
  # Change user journey status from draft/published to personal/shared
  
  This migration:
  1. Drops the old CHECK constraint
  2. Migrates existing data: 'draft' -> 'personal', 'published' -> 'shared'
  3. Updates the CHECK constraint to use 'personal' and 'shared' instead of 'draft' and 'published'
  4. Updates RLS policies to allow public access to both 'personal' and 'shared' journeys (via public link)
  5. Updates the column comment
*/

-- First, drop the old CHECK constraint (must be done before updating data)
ALTER TABLE user_journeys
DROP CONSTRAINT IF EXISTS user_journeys_status_check;

-- Now update existing data (constraint is dropped, so this will work)
UPDATE user_journeys
SET status = CASE 
  WHEN status = 'draft' THEN 'personal'
  WHEN status = 'published' THEN 'shared'
  ELSE status
END
WHERE status IN ('draft', 'published');

-- Add new CHECK constraint with updated values
ALTER TABLE user_journeys
ADD CONSTRAINT user_journeys_status_check 
CHECK (status IN ('personal', 'shared'));

-- Update the default value
ALTER TABLE user_journeys
ALTER COLUMN status SET DEFAULT 'personal';

-- Update the column comment
COMMENT ON COLUMN user_journeys.status IS 'Status of the user journey: personal (only visible to creator in workspace, but can be shared via public link) or shared (visible to all workspace members and can be shared via public link)';

-- Update RLS policy to allow anonymous users to read both personal and shared journeys
-- (Both can be accessed via public link)
-- Drop the old policy that only allowed 'published' status
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;
-- Drop the new policy if it exists (in case migration is re-run)
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

-- Create policy for anonymous users (read-only access to both personal and shared journeys)
CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status IN ('personal', 'shared'));


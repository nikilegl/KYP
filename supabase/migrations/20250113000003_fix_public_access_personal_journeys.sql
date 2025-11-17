/*
  # Fix public access for personal journeys
  
  This migration ensures that anonymous users can access both personal and shared journeys
  via public links. It drops any conflicting policies and creates a clean policy.
  
  IMPORTANT: This must be run after migration 20250113000002_change_status_to_personal_shared.sql
  to ensure the status values have been migrated.
*/

-- First, ensure the status values are correct (in case this runs before the other migration)
UPDATE user_journeys
SET status = CASE 
  WHEN status = 'draft' THEN 'personal'
  WHEN status = 'published' THEN 'shared'
  ELSE status
END
WHERE status IN ('draft', 'published');

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

-- Create policy for anonymous users (read-only access to both personal and shared journeys)
-- Both can be accessed via public link using their short_id
CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status IN ('personal', 'shared'));


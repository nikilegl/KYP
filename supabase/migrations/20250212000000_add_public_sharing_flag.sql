/*
  # Add Public Sharing Flag to User Journeys
  
  This migration adds an explicit flag to control which journeys can be accessed
  via public links. Only journeys with is_publicly_shared = true can be accessed
  by anonymous users, providing better security control.
  
  1. Changes
    - Add is_publicly_shared column (boolean, default false)
    - Update RLS policy to check is_publicly_shared flag
    - Create index for performance
*/

-- Add is_publicly_shared column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'is_publicly_shared'
  ) THEN
    ALTER TABLE user_journeys 
    ADD COLUMN is_publicly_shared boolean NOT NULL DEFAULT false;
    
    RAISE NOTICE 'Added is_publicly_shared column to user_journeys';
  ELSE
    RAISE NOTICE 'is_publicly_shared column already exists in user_journeys';
  END IF;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN user_journeys.is_publicly_shared IS 
  'Whether this journey can be accessed via public link. Only journeys with is_publicly_shared = true can be viewed by anonymous users.';

-- Create index for performance when querying by public_id and is_publicly_shared
CREATE INDEX IF NOT EXISTS idx_user_journeys_public_sharing 
ON user_journeys(public_id, is_publicly_shared) 
WHERE is_publicly_shared = true;

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

-- Create new restrictive policy that only allows access to explicitly shared journeys
CREATE POLICY "Allow anonymous users to read publicly shared journeys"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (is_publicly_shared = true AND public_id IS NOT NULL);

-- Update table comment to reflect the new behavior
COMMENT ON TABLE user_journeys IS 
  'User journeys inherit their status from their parent folder. Journeys in shared folders are shared, journeys in personal folders are personal. Only journeys with is_publicly_shared = true can be accessed via public link.';

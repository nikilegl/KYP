/*
  # Add status column to user_journey_folders table
  
  This migration:
  1. Adds status column with CHECK constraint (personal/shared)
  2. Sets default value to 'personal'
  3. Updates existing folders to 'personal' status
*/

-- Add status column to user_journey_folders
ALTER TABLE user_journey_folders
ADD COLUMN IF NOT EXISTS status text DEFAULT 'personal' NOT NULL;

-- Add CHECK constraint for status values
ALTER TABLE user_journey_folders
DROP CONSTRAINT IF EXISTS user_journey_folders_status_check;

ALTER TABLE user_journey_folders
ADD CONSTRAINT user_journey_folders_status_check 
CHECK (status IN ('personal', 'shared'));

-- Update existing folders to 'personal' status (default)
UPDATE user_journey_folders
SET status = 'personal'
WHERE status IS NULL OR status NOT IN ('personal', 'shared');

-- Add comment to column
COMMENT ON COLUMN user_journey_folders.status IS 'Status of the folder: personal (only visible to creator in workspace) or shared (visible to all workspace members). When a folder is shared, all user journeys and folders inside it are also shared.';


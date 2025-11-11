/*
  # Add nested folder support
  
  This migration adds:
  - parent_folder_id to user_journey_folders for nested folders
  - Cascading delete to remove journeys when folder is deleted
*/

-- Add parent_folder_id for nested folders
ALTER TABLE user_journey_folders
ADD COLUMN IF NOT EXISTS parent_folder_id uuid REFERENCES user_journey_folders(id) ON DELETE CASCADE;

-- Create index for parent folder lookups
CREATE INDEX IF NOT EXISTS idx_user_journey_folders_parent_id ON user_journey_folders(parent_folder_id);

-- Update the ON DELETE behavior for folder_id in user_journeys to CASCADE
-- This will delete all journeys when a folder is deleted
ALTER TABLE user_journeys
DROP CONSTRAINT IF EXISTS user_journeys_folder_id_fkey;

ALTER TABLE user_journeys
ADD CONSTRAINT user_journeys_folder_id_fkey 
FOREIGN KEY (folder_id) 
REFERENCES user_journey_folders(id) 
ON DELETE CASCADE;

-- Add comment
COMMENT ON COLUMN user_journey_folders.parent_folder_id IS 'Parent folder for nested folder structure (null for root folders)';


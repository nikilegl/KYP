-- Add created_by column to user_journey_folders table
ALTER TABLE user_journey_folders
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_journey_folders_created_by ON user_journey_folders(created_by);

-- Add comment
COMMENT ON COLUMN user_journey_folders.created_by IS 'User ID of the person who created this folder';


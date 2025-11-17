-- Prevent accidental deletion of user journeys when folders are deleted
-- Change CASCADE to SET NULL so journeys are preserved when folders are deleted

-- Drop the existing CASCADE constraint
ALTER TABLE user_journeys
DROP CONSTRAINT IF EXISTS user_journeys_folder_id_fkey;

-- Recreate with SET NULL instead of CASCADE
-- This way, if a folder is deleted, journeys remain but folder_id becomes NULL
ALTER TABLE user_journeys
ADD CONSTRAINT user_journeys_folder_id_fkey 
FOREIGN KEY (folder_id) 
REFERENCES user_journey_folders(id) 
ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON CONSTRAINT user_journeys_folder_id_fkey ON user_journeys IS 
'Foreign key to user_journey_folders. Uses SET NULL on delete to preserve journeys when folders are deleted, preventing accidental data loss.';


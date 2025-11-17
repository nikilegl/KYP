-- Add archived field to user_journeys table
-- This allows journeys to be archived instead of permanently deleted

ALTER TABLE user_journeys
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for faster filtering of archived journeys
CREATE INDEX IF NOT EXISTS idx_user_journeys_archived ON user_journeys(archived);

-- Add comment to explain the column
COMMENT ON COLUMN user_journeys.archived IS 'Whether this user journey has been archived (soft delete). Archived journeys can be restored or permanently deleted.';


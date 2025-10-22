-- Add status column to user_journeys table
-- Draft journeys are only visible to their creator
-- Published journeys are visible to all workspace members

-- Add status column with default 'draft'
ALTER TABLE user_journeys
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' 
CHECK (status IN ('draft', 'published'));

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_user_journeys_status ON user_journeys(status);

-- Create index for filtering by status and creator (for draft visibility)
CREATE INDEX IF NOT EXISTS idx_user_journeys_status_created_by ON user_journeys(status, created_by);

-- Add comment to explain the column
COMMENT ON COLUMN user_journeys.status IS 'Status of the user journey: draft (only visible to creator) or published (visible to all workspace members)';

-- Verify the changes
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_journeys'
AND column_name = 'status';


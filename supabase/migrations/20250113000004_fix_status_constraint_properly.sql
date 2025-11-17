/*
  # Fix status constraint properly
  
  This migration properly handles the status constraint migration by:
  1. Finding and dropping any existing status check constraints (including auto-named ones)
  2. Updating the data
  3. Recreating the constraint with the correct values
*/

-- First, find and drop any existing status check constraints
-- PostgreSQL might have auto-generated names, so we need to find them dynamically
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Find all check constraints on user_journeys table
    FOR constraint_record IN
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'user_journeys'::regclass
        AND contype = 'c'
    LOOP
        -- Check if this constraint is related to status
        IF constraint_record.definition LIKE '%status%' OR constraint_record.conname LIKE '%status%' THEN
            EXECUTE format('ALTER TABLE user_journeys DROP CONSTRAINT IF EXISTS %I', constraint_record.conname);
            RAISE NOTICE 'Dropped constraint: % (definition: %)', constraint_record.conname, constraint_record.definition;
        END IF;
    END LOOP;
END $$;

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
DROP POLICY IF EXISTS "Allow anonymous users to read published journeys" ON user_journeys;
DROP POLICY IF EXISTS "Allow anonymous users to read journeys via public link" ON user_journeys;

CREATE POLICY "Allow anonymous users to read journeys via public link"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status IN ('personal', 'shared'));


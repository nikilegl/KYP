/*
  # Add team member fields to workspace_users

  1. New Columns
    - `full_name` (text, nullable) - Full name of the team member
    - `team` (text, nullable) - Team assignment (Design/Product/Engineering/Other)
  
  2. Constraints
    - Add check constraint for team values
  
  3. Security
    - No RLS changes needed as existing policies cover new fields
*/

-- Add full_name column to workspace_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE workspace_users ADD COLUMN full_name text;
  END IF;
END $$;

-- Add team column to workspace_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_users' AND column_name = 'team'
  ) THEN
    ALTER TABLE workspace_users ADD COLUMN team text;
  END IF;
END $$;

-- Add check constraint for team values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'workspace_users_team_check'
  ) THEN
    ALTER TABLE workspace_users 
    ADD CONSTRAINT workspace_users_team_check 
    CHECK (team IS NULL OR team IN ('Design', 'Product', 'Engineering', 'Other'));
  END IF;
END $$;
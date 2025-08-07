/*
  # Create User Permissions System

  1. New Tables
    - `user_permissions`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, unique, not null)
      - `description` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Table Modifications
    - Add `user_permission_id` column to `stakeholders` table
    - Foreign key constraint to `user_permissions(id)` with ON DELETE SET NULL

  3. Initial Data
    - Create three default permissions: General User, Administrator, Not applicable
    - Assign all existing stakeholders to 'General User' permission

  4. Security
    - Enable RLS on `user_permissions` table
    - Add policy for authenticated users to manage user permissions
*/

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Enable RLS on user_permissions table
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage user permissions
CREATE POLICY "Allow authenticated users to manage user permissions"
  ON user_permissions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add user_permission_id column to stakeholders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'user_permission_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN user_permission_id uuid REFERENCES user_permissions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_workspace_id ON user_permissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_user_permission_id ON stakeholders(user_permission_id);

-- Insert default user permissions for each workspace
DO $$
DECLARE
  workspace_record RECORD;
  general_user_id uuid;
  admin_id uuid;
  not_applicable_id uuid;
BEGIN
  -- Loop through all workspaces and create default permissions
  FOR workspace_record IN SELECT id FROM workspaces LOOP
    -- Insert General User permission
    INSERT INTO user_permissions (workspace_id, name, description)
    VALUES (workspace_record.id, 'General User', 'Standard user permissions')
    ON CONFLICT (workspace_id, name) DO NOTHING
    RETURNING id INTO general_user_id;
    
    -- Get the ID if it already existed
    IF general_user_id IS NULL THEN
      SELECT id INTO general_user_id 
      FROM user_permissions 
      WHERE workspace_id = workspace_record.id AND name = 'General User';
    END IF;
    
    -- Insert Administrator permission
    INSERT INTO user_permissions (workspace_id, name, description)
    VALUES (workspace_record.id, 'Administrator', 'Elevated administrative permissions')
    ON CONFLICT (workspace_id, name) DO NOTHING;
    
    -- Insert Not applicable permission
    INSERT INTO user_permissions (workspace_id, name, description)
    VALUES (workspace_record.id, 'Not applicable', 'No specific user permissions apply')
    ON CONFLICT (workspace_id, name) DO NOTHING;
    
    -- Update all existing stakeholders in this workspace to have 'General User' permission
    -- Only update stakeholders that don't already have a user_permission_id set
    UPDATE stakeholders 
    SET user_permission_id = general_user_id,
        updated_at = now()
    WHERE workspace_id = workspace_record.id 
      AND user_permission_id IS NULL;
  END LOOP;
END $$;
/*
  # Add User Journey Groups
  
  1. New Tables
    - `user_journey_groups`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text)
      - `color` (text, optional - for visual distinction)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Changes
    - Add `group_id` column to `user_journeys` table
  
  3. Security
    - Enable RLS on user_journey_groups table
    - Add policies for workspace members to manage groups
*/

-- Create user_journey_groups table
CREATE TABLE IF NOT EXISTS user_journey_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add group_id column to user_journeys
ALTER TABLE user_journeys
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES user_journey_groups(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_journey_groups_workspace_id ON user_journey_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_group_id ON user_journeys(group_id);

-- Enable Row Level Security
ALTER TABLE user_journey_groups ENABLE ROW LEVEL SECURITY;

-- Create policies for user_journey_groups
-- Allow workspace members to view groups in their workspace
CREATE POLICY "Users can view groups in their workspace"
  ON user_journey_groups
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members to create groups in their workspace
CREATE POLICY "Users can create groups in their workspace"
  ON user_journey_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members to update groups in their workspace
CREATE POLICY "Users can update groups in their workspace"
  ON user_journey_groups
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Allow workspace members to delete groups in their workspace
CREATE POLICY "Users can delete groups in their workspace"
  ON user_journey_groups
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE user_journey_groups IS 'Groups for organizing user journeys within a workspace';
COMMENT ON COLUMN user_journey_groups.color IS 'Hex color code for visual distinction (e.g., #3B82F6)';
COMMENT ON COLUMN user_journeys.group_id IS 'Optional group assignment for organizing user journeys';


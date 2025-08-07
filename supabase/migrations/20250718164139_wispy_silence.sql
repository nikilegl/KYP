/*
  # Fix RLS Policies for Multi-User Workspaces

  1. Security Updates
    - Update workspace_users policies to allow workspace owners/admins to manage users
    - Allow users to view workspace members they belong to
    - Enable proper user invitation workflow

  2. Policy Changes
    - Workspace owners can add/remove users
    - Workspace admins can add/remove users (except owners)
    - Users can view their own workspace memberships
    - Users can view other members in their workspaces
*/

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can insert workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can update workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can delete workspace memberships" ON workspace_users;

-- Create new comprehensive policies for workspace_users

-- Allow users to view workspace members in workspaces they belong to
CREATE POLICY "Users can view workspace members"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow workspace owners and admins to add new users
CREATE POLICY "Workspace owners and admins can add users"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.workspace_id = workspace_users.workspace_id
        AND wu.user_id = auth.uid()
        AND wu.role IN ('owner', 'admin')
        AND wu.status = 'active'
    )
  );

-- Allow workspace owners and admins to update user roles/status
CREATE POLICY "Workspace owners and admins can update users"
  ON workspace_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.workspace_id = workspace_users.workspace_id
        AND wu.user_id = auth.uid()
        AND wu.role IN ('owner', 'admin')
        AND wu.status = 'active'
    )
  );

-- Allow workspace owners and admins to remove users (but not other owners)
CREATE POLICY "Workspace owners and admins can remove users"
  ON workspace_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu
      WHERE wu.workspace_id = workspace_users.workspace_id
        AND wu.user_id = auth.uid()
        AND wu.role IN ('owner', 'admin')
        AND wu.status = 'active'
    )
    AND (
      role != 'owner' OR 
      EXISTS (
        SELECT 1 
        FROM workspace_users wu
        WHERE wu.workspace_id = workspace_users.workspace_id
          AND wu.user_id = auth.uid()
          AND wu.role = 'owner'
          AND wu.status = 'active'
      )
    )
  );

-- Update workspaces policies to be more permissive for workspace members
DROP POLICY IF EXISTS "Users can view their workspaces" ON workspaces;

CREATE POLICY "Users can view workspaces they belong to"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Update other table policies to work with workspace membership

-- Projects: Allow all workspace members to manage projects
DROP POLICY IF EXISTS "Users can manage projects" ON projects;

CREATE POLICY "Workspace members can manage projects"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Stakeholders: Allow all workspace members to manage stakeholders
DROP POLICY IF EXISTS "Users can manage stakeholders" ON stakeholders;

CREATE POLICY "Workspace members can manage stakeholders"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Research Notes: Allow all workspace members to manage research notes
DROP POLICY IF EXISTS "Users can manage research notes" ON research_notes;

CREATE POLICY "Workspace members can manage research notes"
  ON research_notes
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id = auth.uid() AND wu.status = 'active'
    )
  );
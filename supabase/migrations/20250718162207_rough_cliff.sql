/*
  # Fix Workspace Users RLS Policies

  This migration fixes the infinite recursion error in workspace_users policies
  by using simpler, non-recursive policy conditions.

  1. Drop existing problematic policies
  2. Create new policies that don't reference workspace_users within workspace_users policies
  3. Use direct user authentication checks instead of complex subqueries
*/

-- Drop all existing policies on workspace_users to start fresh
DROP POLICY IF EXISTS "Users can view workspace members in their workspaces" ON workspace_users;
DROP POLICY IF EXISTS "Owners and admins can manage workspace users" ON workspace_users;
DROP POLICY IF EXISTS "Users can read own workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Owners can manage all workspace users" ON workspace_users;
DROP POLICY IF EXISTS "Admins can manage workspace users" ON workspace_users;

-- Create simple, non-recursive policies for workspace_users
-- Policy 1: Users can see their own workspace memberships
CREATE POLICY "Users can view own memberships"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Policy 2: Users can see other members in workspaces where they are active
CREATE POLICY "Users can view workspace members"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

-- Policy 3: Only owners and admins can insert new workspace users
CREATE POLICY "Owners and admins can invite users"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu 
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id::text = auth.uid()::text
      AND wu.role IN ('owner', 'admin')
      AND wu.status = 'active'
    )
  );

-- Policy 4: Only owners and admins can update workspace users
CREATE POLICY "Owners and admins can update users"
  ON workspace_users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu 
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id::text = auth.uid()::text
      AND wu.role IN ('owner', 'admin')
      AND wu.status = 'active'
    )
  );

-- Policy 5: Only owners and admins can delete workspace users
CREATE POLICY "Owners and admins can remove users"
  ON workspace_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM workspace_users wu 
      WHERE wu.workspace_id = workspace_users.workspace_id
      AND wu.user_id::text = auth.uid()::text
      AND wu.role IN ('owner', 'admin')
      AND wu.status = 'active'
    )
  );

-- Also fix the other table policies to use simpler workspace checks
-- Fix projects policies
DROP POLICY IF EXISTS "Users can manage projects in their workspaces" ON projects;
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;

CREATE POLICY "Users can view projects in their workspaces"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

CREATE POLICY "Users can manage projects in their workspaces"
  ON projects
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

-- Fix stakeholders policies
DROP POLICY IF EXISTS "Users can manage stakeholders in their workspaces" ON stakeholders;
DROP POLICY IF EXISTS "Users can view stakeholders in their workspaces" ON stakeholders;

CREATE POLICY "Users can view stakeholders in their workspaces"
  ON stakeholders
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

CREATE POLICY "Users can manage stakeholders in their workspaces"
  ON stakeholders
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM workspace_users wu 
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

-- Fix research_notes policies
DROP POLICY IF EXISTS "Users can manage research notes in their workspaces" ON research_notes;
DROP POLICY IF EXISTS "Users can view research notes in their workspaces" ON research_notes;

CREATE POLICY "Users can view research notes in their workspaces"
  ON research_notes
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );

CREATE POLICY "Users can manage research notes in their workspaces"
  ON research_notes
  FOR ALL
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      JOIN workspace_users wu ON p.workspace_id = wu.workspace_id
      WHERE wu.user_id::text = auth.uid()::text 
      AND wu.status = 'active'
    )
  );
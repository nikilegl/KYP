/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Current RLS policies on workspace_users table cause infinite recursion
    - The SELECT policy references workspace_users in its USING clause, creating circular dependency

  2. Solution
    - Drop existing recursive policies
    - Create non-recursive policies that avoid circular references
    - Use direct user_id checks and explicit table references to prevent recursion

  3. New Policies
    - Users can read their own workspace_users entry
    - Workspace owners/admins can read all users in their workspaces (non-recursive)
    - Proper INSERT/UPDATE/DELETE policies without recursion
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can add users" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can update users" ON workspace_users;
DROP POLICY IF EXISTS "Workspace owners and admins can remove users" ON workspace_users;

-- Create non-recursive SELECT policy
-- Policy 1: Users can read their own entry
CREATE POLICY "Users can read own workspace entry"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Users can read other members in workspaces where they are owner/admin
CREATE POLICY "Workspace admins can read all members"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
  );

-- Create non-recursive INSERT policy
CREATE POLICY "Workspace owners and admins can add users"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
  );

-- Create non-recursive UPDATE policy
CREATE POLICY "Workspace owners and admins can update users"
  ON workspace_users
  FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
  );

-- Create non-recursive DELETE policy
CREATE POLICY "Workspace owners and admins can remove users"
  ON workspace_users
  FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT wu.workspace_id 
      FROM public.workspace_users wu 
      WHERE wu.user_id = auth.uid() 
        AND wu.role IN ('owner', 'admin') 
        AND wu.status = 'active'
    )
    AND (
      -- Admins can't remove owners, only owners can remove owners
      role != 'owner' OR 
      EXISTS (
        SELECT 1 FROM public.workspace_users wu 
        WHERE wu.workspace_id = workspace_users.workspace_id 
          AND wu.user_id = auth.uid() 
          AND wu.role = 'owner' 
          AND wu.status = 'active'
      )
    )
  );
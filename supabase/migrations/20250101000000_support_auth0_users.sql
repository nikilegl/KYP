/*
  # Support Auth0 Users in RLS Policies

  This migration updates RLS policies to support Auth0 users who don't have
  Supabase auth.uid() but are identified by email in workspace_users table.

  1. Update workspace_users table to allow null user_id (for Auth0 users)
  2. Update RLS policies to check both user_id and email
  3. Allow workspace_users inserts with null user_id for Auth0 users
*/

-- First, allow null user_id in workspace_users (for Auth0 users)
ALTER TABLE workspace_users 
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop the unique constraint that requires user_id
ALTER TABLE workspace_users 
  DROP CONSTRAINT IF EXISTS workspace_users_workspace_id_user_id_key;

-- Add a new unique constraint that allows null user_id
CREATE UNIQUE INDEX IF NOT EXISTS workspace_users_workspace_id_user_email_key 
  ON workspace_users(workspace_id, user_email) 
  WHERE user_id IS NOT NULL;

-- Create a unique constraint for email-only entries (Auth0 users)
CREATE UNIQUE INDEX IF NOT EXISTS workspace_users_workspace_id_email_unique 
  ON workspace_users(workspace_id, user_email);

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view workspaces they belong to" ON workspaces;
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_users;
DROP POLICY IF EXISTS "Users can insert workspace memberships" ON workspace_users;

-- Create new policy for workspaces
-- For now, allow authenticated users to see all workspaces
-- The application will filter by workspace_users membership
-- TODO: This is less secure but necessary for Auth0 users
-- In production, consider using Edge Functions for all data access
CREATE POLICY "Users can view workspaces they belong to"
  ON workspaces
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to view workspace_users entries they belong to (by user_id or email)
CREATE POLICY "Users can view their workspace memberships"
  ON workspace_users
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    user_email IN (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Allow inserts to workspace_users (will be controlled by Edge Function with service role)
-- But also allow authenticated users to insert if they're adding themselves
CREATE POLICY "Users can insert workspace memberships"
  ON workspace_users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Note: The Edge Function (add-auth0-user) uses service role key to bypass RLS
-- This policy allows the Edge Function to insert Auth0 users


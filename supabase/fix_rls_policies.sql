-- Fix RLS policies for user_project_preferences table
-- Run this in your Supabase Dashboard SQL Editor

-- First, let's check the current RLS status
SELECT 'Current RLS status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'user_project_preferences';

-- Check existing policies
SELECT 'Existing policies:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_project_preferences';

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can manage their own project preferences" ON user_project_preferences;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_project_preferences;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_project_preferences;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_project_preferences;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_project_preferences;

-- Ensure RLS is enabled
ALTER TABLE user_project_preferences ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for all operations
-- Policy 1: Allow users to read their own preferences
CREATE POLICY "Users can read their own project preferences"
  ON user_project_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Allow users to insert their own preferences
CREATE POLICY "Users can insert their own project preferences"
  ON user_project_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow users to update their own preferences
CREATE POLICY "Users can update their own project preferences"
  ON user_project_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow users to delete their own preferences
CREATE POLICY "Users can delete their own project preferences"
  ON user_project_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Alternative: If you want to allow all authenticated users to read all preferences (for debugging)
-- Uncomment the following line if you want to see all preferences:
-- CREATE POLICY "Enable read access for all authenticated users" ON user_project_preferences FOR SELECT TO authenticated USING (true);

-- Verify the policies were created
SELECT 'New policies created:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_project_preferences';

-- Test the policies by trying to insert a test record
-- This will help verify the policies are working
SELECT 'Testing policy with current user:' as info;
SELECT auth.uid() as current_user_id;

-- Check if there are any existing records
SELECT 'Existing records count:' as info;
SELECT COUNT(*) as total_records FROM user_project_preferences;

-- Show sample records (if any exist)
SELECT 'Sample records:' as info;
SELECT * FROM user_project_preferences LIMIT 5;


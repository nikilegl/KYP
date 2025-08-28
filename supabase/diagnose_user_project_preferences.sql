-- Diagnostic script to check the user_project_preferences table
-- Run this in your Supabase Dashboard SQL Editor

-- 1. Check if the table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'user_project_preferences';

-- 2. Check the table structure (columns)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_project_preferences'
ORDER BY ordinal_position;

-- 2a. Check if order_position column exists (this is what we need)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_project_preferences' 
      AND column_name = 'order_position'
    ) THEN '✅ order_position column exists'
    ELSE '❌ order_position column missing'
  END as order_position_status;

-- 3. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'user_project_preferences';

-- 4. Check RLS policies
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

-- 5. Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'user_project_preferences';

-- 6. Try to select from the table (this will show any permission issues)
SELECT COUNT(*) as total_rows FROM user_project_preferences;

-- 7. Check if there are any rows
SELECT * FROM user_project_preferences LIMIT 5;

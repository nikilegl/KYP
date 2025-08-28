-- Check the current state of user_project_preferences table
-- Run this in your Supabase Dashboard SQL Editor

-- 1. Check if the table exists and its structure
SELECT 
  table_name,
  table_schema,
  table_type
FROM information_schema.tables 
WHERE table_name = 'user_project_preferences';

-- 2. Check the table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_name = 'user_project_preferences'
ORDER BY ordinal_position;

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

-- 6. Check if there are any rows (this will show permission issues)
SELECT COUNT(*) as total_rows FROM user_project_preferences;

-- 7. Check sample data (if any exists)
SELECT * FROM user_project_preferences LIMIT 5;

-- 8. Check foreign key constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'user_project_preferences';

-- 9. Test insert with a dummy user (this should fail due to RLS)
-- Replace with a real user ID from your auth.users table if you want to test
INSERT INTO user_project_preferences (user_id, project_id, order_position)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 0)
ON CONFLICT (user_id, project_id) DO NOTHING;

-- 10. Check if the insert was blocked (should show 0 rows)
SELECT COUNT(*) as rows_after_test_insert FROM user_project_preferences;

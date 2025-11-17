-- Check user journeys created by yana.georgieva@legl.com
-- Run this in Supabase SQL Editor

-- First, find the user ID for yana.georgieva@legl.com
SELECT 
    id,
    email,
    created_at
FROM auth.users
WHERE email = 'yana.georgieva@legl.com';

-- Then check all journeys (including archived) created by this user
-- Replace USER_ID_HERE with the id from above query
WITH yana_user AS (
    SELECT id as user_id
    FROM auth.users
    WHERE email = 'yana.georgieva@legl.com'
)
SELECT 
    uj.id,
    uj.name,
    uj.description,
    uj.created_at,
    uj.updated_at,
    uj.archived,
    uj.status,
    uj.project_id,
    uj.folder_id,
    p.name as project_name,
    u.email as created_by_email
FROM user_journeys uj
LEFT JOIN projects p ON uj.project_id = p.id
LEFT JOIN auth.users u ON uj.created_by = u.id
CROSS JOIN yana_user
WHERE uj.created_by = yana_user.user_id
ORDER BY uj.created_at DESC;

-- Check count of journeys by status
WITH yana_user AS (
    SELECT id as user_id
    FROM auth.users
    WHERE email = 'yana.georgieva@legl.com'
)
SELECT 
    COUNT(*) as total_journeys,
    COUNT(*) FILTER (WHERE archived = true) as archived_count,
    COUNT(*) FILTER (WHERE archived = false OR archived IS NULL) as active_count,
    COUNT(*) FILTER (WHERE status = 'personal') as personal_count,
    COUNT(*) FILTER (WHERE status = 'shared') as shared_count
FROM user_journeys uj
CROSS JOIN yana_user
WHERE uj.created_by = yana_user.user_id;

-- Note: If journeys were permanently deleted (not archived), they won't appear in these queries
-- Check Supabase backups or audit logs if available


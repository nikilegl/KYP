-- Check for potential accidental deletions of user journeys
-- Run this in Supabase SQL Editor

-- CRITICAL FINDING: Migration 20250111000004_add_nested_folders.sql changed
-- folder_id foreign key to ON DELETE CASCADE, meaning if a folder was deleted,
-- ALL journeys in that folder would have been permanently deleted!

-- 1. Check if there are any deleted folders (we can't recover these, but we can check)
-- Note: If folders were deleted, the journeys are gone unless you have backups

-- 2. Check current state - find user journeys created by yana.georgieva@legl.com
WITH yana_user AS (
    SELECT id as user_id, email
    FROM auth.users
    WHERE email = 'yana.georgieva@legl.com'
)
SELECT 
    uj.id,
    uj.name,
    uj.created_at,
    uj.updated_at,
    uj.archived,
    uj.status,
    uj.folder_id,
    uf.name as folder_name,
    uf.id as folder_id_check,
    p.name as project_name,
    yana_user.email as created_by_email
FROM user_journeys uj
LEFT JOIN projects p ON uj.project_id = p.id
LEFT JOIN user_journey_folders uf ON uj.folder_id = uf.id
CROSS JOIN yana_user
WHERE uj.created_by = yana_user.user_id
ORDER BY uj.created_at DESC;

-- 3. Check for journeys that reference non-existent folders (orphaned)
-- These would indicate folders were deleted, causing CASCADE deletion
SELECT 
    uj.id,
    uj.name,
    uj.folder_id,
    uj.created_at,
    uj.created_by,
    u.email as created_by_email
FROM user_journeys uj
LEFT JOIN auth.users u ON uj.created_by = u.id
WHERE uj.folder_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM user_journey_folders uf 
    WHERE uf.id = uj.folder_id
);

-- 4. Count journeys by yana that might have been affected
WITH yana_user AS (
    SELECT id as user_id
    FROM auth.users
    WHERE email = 'yana.georgieva@legl.com'
)
SELECT 
    COUNT(*) as total_journeys,
    COUNT(*) FILTER (WHERE folder_id IS NOT NULL) as journeys_in_folders,
    COUNT(*) FILTER (WHERE archived = true) as archived_count,
    COUNT(*) FILTER (WHERE archived = false OR archived IS NULL) as active_count
FROM user_journeys uj
CROSS JOIN yana_user
WHERE uj.created_by = yana_user.user_id;

-- 5. Check folder deletion history (if you have audit logs enabled)
-- This query checks for any folders that might have been deleted
-- Note: This only works if you have audit logging enabled
SELECT 
    schemaname,
    tablename,
    action,
    action_tstamp,
    row_data
FROM audit.logged_actions
WHERE tablename = 'user_journey_folders'
AND action = 'D'
ORDER BY action_tstamp DESC
LIMIT 50;

-- IMPORTANT NOTES:
-- 1. If journeys were deleted due to CASCADE when folders were deleted,
--    they are PERMANENTLY GONE unless you have:
--    - Database backups
--    - Point-in-time recovery enabled
--    - Audit logs with the deleted data
--
-- 2. The migration 20250111000004_add_nested_folders.sql changed the behavior
--    to CASCADE delete, which means deleting a folder deletes all journeys in it.
--
-- 3. Consider changing this to ON DELETE SET NULL instead of CASCADE to prevent
--    accidental deletions in the future.


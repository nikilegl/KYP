/*
  # Add full name extraction to workspace user triggers
  
  This migration updates the workspace_users table to include full names
  from the auth.users table where they exist.
  
  Google OAuth users have their display name stored in auth.users,
  so we just need to sync it to workspace_users.
*/

-- First, let's backfill full_name for existing users from auth.users
-- The display name from Google is stored in raw_user_meta_data
UPDATE workspace_users wu
SET 
  full_name = COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'display_name',
    au.raw_app_meta_data->>'full_name',
    au.raw_app_meta_data->>'name'
  ),
  updated_at = now()
FROM auth.users au
WHERE 
  wu.user_id = au.id
  AND (wu.full_name IS NULL OR wu.full_name = '')
  AND (
    au.raw_user_meta_data->>'full_name' IS NOT NULL
    OR au.raw_user_meta_data->>'name' IS NOT NULL
    OR au.raw_user_meta_data->>'display_name' IS NOT NULL
    OR au.raw_app_meta_data->>'full_name' IS NOT NULL
    OR au.raw_app_meta_data->>'name' IS NOT NULL
  );

-- Update the auto_add_legl_user function to include full_name
CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_email text;
  user_full_name text;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Only process @legl.com emails
  IF user_email IS NULL OR NOT (user_email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Extract full name from user metadata (Google OAuth stores it here)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    user_email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the email change function too
CREATE OR REPLACE FUNCTION auto_add_legl_user_on_update()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_full_name text;
BEGIN
  -- Only process if email changed to @legl.com
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if email didn't change
  IF OLD.email = NEW.email THEN
    RETURN NEW;
  END IF;
  
  -- Extract full name from user metadata
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', NEW.id)
    RETURNING id INTO legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    full_name,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    NEW.email,
    user_full_name,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

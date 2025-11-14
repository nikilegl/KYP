/*
  # Ensure Google OAuth users are added to Legl workspace
  
  This migration:
  1. Ensures the trigger is properly set up and active
  2. Backfills any existing @legl.com users who aren't in workspace_users
  3. Includes full_name extraction from Google OAuth metadata
*/

-- First, ensure the trigger function includes full_name extraction
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

-- Ensure the trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user();

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

-- Ensure the update trigger exists and is active
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user_on_update();

-- Backfill: Add all existing @legl.com users who aren't in workspace_users
DO $$
DECLARE
  legl_workspace_id uuid;
  user_record RECORD;
  user_full_name text;
  added_count integer := 0;
  first_user_id uuid;
BEGIN
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    -- Try to get the first @legl.com user as creator
    SELECT id INTO first_user_id
    FROM auth.users
    WHERE email ILIKE '%@legl.com'
    LIMIT 1;
    
    IF first_user_id IS NULL THEN
      RAISE NOTICE 'No @legl.com users found, skipping workspace creation';
      RETURN;
    END IF;
    
    INSERT INTO workspaces (name, created_by)
    VALUES ('Legl', first_user_id)
    RETURNING id INTO legl_workspace_id;
    
    RAISE NOTICE 'Created Legl workspace: %', legl_workspace_id;
  ELSE
    RAISE NOTICE 'Found existing Legl workspace: %', legl_workspace_id;
  END IF;
  
  -- Add all existing @legl.com users who aren't already in workspace_users
  FOR user_record IN 
    SELECT 
      au.id,
      au.email,
      COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'display_name',
        au.raw_app_meta_data->>'full_name',
        au.raw_app_meta_data->>'name'
      ) as full_name
    FROM auth.users au
    WHERE au.email ILIKE '%@legl.com'
      AND NOT EXISTS (
        SELECT 1 
        FROM workspace_users wu 
        WHERE wu.workspace_id = legl_workspace_id
          AND (wu.user_id = au.id OR wu.user_email = au.email)
      )
  LOOP
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
      user_record.id,
      user_record.email,
      user_record.full_name,
      'member',
      'active'
    )
    ON CONFLICT (workspace_id, user_email) 
    DO UPDATE SET
      user_id = user_record.id,
      full_name = COALESCE(EXCLUDED.full_name, workspace_users.full_name),
      status = 'active',
      updated_at = now();
    
    added_count := added_count + 1;
    RAISE NOTICE 'Added user % to workspace', user_record.email;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: Added % users to workspace', added_count;
END $$;


/*
  # Add Debugging to User Signup Process
  
  This migration adds comprehensive logging to the auto_add_legl_user trigger
  function to help debug signup issues. All steps are logged with RAISE NOTICE
  so they appear in Supabase logs.
  
  To view logs:
  1. Go to Supabase Dashboard > Logs > Postgres Logs
  2. Filter for "auto_add_legl_user" or "SIGNUP_DEBUG"
*/

-- Recreate the trigger function with comprehensive debugging
CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  legl_workspace_id uuid;
  user_email text;
  user_full_name text;
  insert_result text;
BEGIN
  -- Log trigger start
  RAISE NOTICE 'SIGNUP_DEBUG: Trigger fired for user ID: %, Email: %', NEW.id, NEW.email;
  
  -- Get user email
  user_email := NEW.email;
  RAISE NOTICE 'SIGNUP_DEBUG: Extracted email: %', user_email;
  
  -- Only process @legl.com emails
  IF user_email IS NULL THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Email is NULL, skipping';
    RETURN NEW;
  END IF;
  
  IF NOT (user_email ILIKE '%@legl.com') THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Email % does not match @legl.com pattern, skipping', user_email;
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Email % matches @legl.com pattern, proceeding', user_email;
  
  -- Extract full name from user metadata (Google OAuth stores it here)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_app_meta_data->>'full_name',
    NEW.raw_app_meta_data->>'name'
  );
  RAISE NOTICE 'SIGNUP_DEBUG: Extracted full_name: %', user_full_name;
  
  -- Find or create "Legl" workspace
  RAISE NOTICE 'SIGNUP_DEBUG: Looking for Legl workspace...';
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Legl workspace not found, creating new workspace...';
    BEGIN
      INSERT INTO workspaces (name, created_by)
      VALUES ('Legl', NEW.id)
      RETURNING id INTO legl_workspace_id;
      RAISE NOTICE 'SIGNUP_DEBUG: Created Legl workspace with ID: %', legl_workspace_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'SIGNUP_DEBUG: ERROR creating workspace: % - %', SQLSTATE, SQLERRM;
      -- Try to find it again in case of race condition
      SELECT id INTO legl_workspace_id
      FROM workspaces
      WHERE name = 'Legl'
      LIMIT 1;
      
      IF legl_workspace_id IS NULL THEN
        RAISE EXCEPTION 'SIGNUP_DEBUG: CRITICAL - Could not create or find Legl workspace. Error: %', SQLERRM;
      ELSE
        RAISE NOTICE 'SIGNUP_DEBUG: Found workspace after retry: %', legl_workspace_id;
      END IF;
    END;
  ELSE
    RAISE NOTICE 'SIGNUP_DEBUG: Found existing Legl workspace with ID: %', legl_workspace_id;
  END IF;
  
  -- Add user to workspace with full_name
  RAISE NOTICE 'SIGNUP_DEBUG: Attempting to insert into workspace_users...';
  RAISE NOTICE 'SIGNUP_DEBUG: Values - workspace_id: %, user_id: %, user_email: %, full_name: %, role: member, status: active', 
    legl_workspace_id, NEW.id, user_email, user_full_name;
  
  BEGIN
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
    
    RAISE NOTICE 'SIGNUP_DEBUG: Successfully inserted/updated user in workspace_users';
    
    -- Verify the insert worked (use table alias to avoid ambiguity)
    SELECT COUNT(*) INTO insert_result
    FROM workspace_users wu
    WHERE wu.workspace_id = legl_workspace_id 
      AND (wu.user_id = NEW.id OR wu.user_email = user_email);
    
    RAISE NOTICE 'SIGNUP_DEBUG: Verification - Found % matching entries in workspace_users', insert_result;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'SIGNUP_DEBUG: ERROR inserting into workspace_users: % - %', SQLSTATE, SQLERRM;
    RAISE WARNING 'SIGNUP_DEBUG: Error details - workspace_id: %, user_id: %, user_email: %', 
      legl_workspace_id, NEW.id, user_email;
    
    -- Check RLS policies
    RAISE NOTICE 'SIGNUP_DEBUG: Checking if RLS might be blocking...';
    RAISE NOTICE 'SIGNUP_DEBUG: Current user context: auth.uid() = %', auth.uid();
    
    -- Re-raise the error so signup fails
    RAISE EXCEPTION 'SIGNUP_DEBUG: Failed to add user to workspace_users. Original error: %', SQLERRM;
  END;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Trigger completed successfully for user: %', user_email;
  RETURN NEW;
END;
$$;

-- Also add debugging to the update function
CREATE OR REPLACE FUNCTION auto_add_legl_user_on_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  legl_workspace_id uuid;
  user_full_name text;
BEGIN
  RAISE NOTICE 'SIGNUP_DEBUG: Update trigger fired - OLD.email: %, NEW.email: %', OLD.email, NEW.email;
  
  -- Only process if email changed to @legl.com
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Update - Email does not match @legl.com, skipping';
    RETURN NEW;
  END IF;
  
  -- Skip if email didn't change
  IF OLD.email = NEW.email THEN
    RAISE NOTICE 'SIGNUP_DEBUG: Update - Email unchanged, skipping';
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'SIGNUP_DEBUG: Update - Processing email change to @legl.com';
  
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
$$;

-- Ensure the trigger is active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user();


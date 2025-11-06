/*
  # Auto-add @legl.com users to workspace
  
  This migration creates a trigger that automatically adds users with @legl.com
  email addresses to the "Legl" workspace when they sign up.
  
  1. Create function to handle new user signups
  2. Create trigger on auth.users
  3. Ensure "Legl" workspace exists or create it
*/

-- Function to automatically add @legl.com users to workspace
CREATE OR REPLACE FUNCTION auto_add_legl_user()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
  user_email text;
BEGIN
  -- Get user email
  user_email := NEW.email;
  
  -- Only process @legl.com emails
  IF user_email IS NULL OR NOT (user_email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
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
  
  -- Add user to workspace (ignore if already exists)
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    user_email,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
-- This fires after a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user();

-- Also handle email updates (in case user changes email to @legl.com)
CREATE OR REPLACE FUNCTION auto_add_legl_user_on_update()
RETURNS TRIGGER AS $$
DECLARE
  legl_workspace_id uuid;
BEGIN
  -- Only process if email changed to @legl.com
  IF NEW.email IS NULL OR NOT (NEW.email ILIKE '%@legl.com') THEN
    RETURN NEW;
  END IF;
  
  -- Skip if email didn't change
  IF OLD.email = NEW.email THEN
    RETURN NEW;
  END IF;
  
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
  
  -- Add user to workspace (ignore if already exists)
  INSERT INTO workspace_users (
    workspace_id,
    user_id,
    user_email,
    role,
    status
  )
  VALUES (
    legl_workspace_id,
    NEW.id,
    NEW.email,
    'member',
    'active'
  )
  ON CONFLICT (workspace_id, user_email) 
  DO UPDATE SET
    user_id = NEW.id,
    status = 'active',
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_legl_user_on_update();


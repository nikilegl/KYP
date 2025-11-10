-- Fix missing workspace_user entries for existing authenticated users
-- This ensures all existing users are added to a workspace

DO $$
DECLARE
  legl_workspace_id uuid;
  user_record RECORD;
BEGIN
  -- Find or create "Legl" workspace
  SELECT id INTO legl_workspace_id
  FROM workspaces
  WHERE name = 'Legl'
  LIMIT 1;
  
  -- Create workspace if it doesn't exist
  IF legl_workspace_id IS NULL THEN
    INSERT INTO workspaces (name)
    VALUES ('Legl')
    RETURNING id INTO legl_workspace_id;
    
    RAISE NOTICE 'Created Legl workspace: %', legl_workspace_id;
  ELSE
    RAISE NOTICE 'Found existing Legl workspace: %', legl_workspace_id;
  END IF;
  
  -- Add all existing @legl.com users who aren't already in workspace_users
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE email ILIKE '%@legl.com'
      AND id NOT IN (
        SELECT user_id 
        FROM workspace_users 
        WHERE user_id IS NOT NULL
      )
  LOOP
    INSERT INTO workspace_users (
      workspace_id,
      user_id,
      user_email,
      role,
      status
    )
    VALUES (
      legl_workspace_id,
      user_record.id,
      user_record.email,
      'admin', -- Make them admin since they're existing users
      'active'
    )
    ON CONFLICT (workspace_id, user_email) 
    DO UPDATE SET
      user_id = user_record.id,
      status = 'active',
      updated_at = now();
    
    RAISE NOTICE 'Added user % to workspace', user_record.email;
  END LOOP;
END $$;


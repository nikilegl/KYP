-- Fix script for user_project_preferences table
-- Run this in your Supabase Dashboard SQL Editor AFTER running the diagnostic script

-- First, let's see what we're working with
SELECT 'Current table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_project_preferences'
ORDER BY ordinal_position;

-- Check if we need to add missing columns
DO $$
BEGIN
    -- Check if order_index column exists (this is what we need)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_project_preferences' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE user_project_preferences ADD COLUMN order_index integer NOT NULL DEFAULT 0;
        RAISE NOTICE 'Added order_index column';
    ELSE
        RAISE NOTICE 'order_index column already exists';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_project_preferences' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE user_project_preferences ADD COLUMN created_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added created_at column';
    ELSE
        RAISE NOTICE 'created_at column already exists';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_project_preferences' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE user_project_preferences ADD COLUMN updated_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE user_project_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their own project preferences" ON user_project_preferences;

-- Create the correct policy
CREATE POLICY "Users can manage their own project preferences"
  ON user_project_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_project_preferences_user_id_project_id_key'
    ) THEN
        ALTER TABLE user_project_preferences 
        ADD CONSTRAINT user_project_preferences_user_id_project_id_key 
        UNIQUE(user_id, project_id);
        RAISE NOTICE 'Added unique constraint';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_user_id ON user_project_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_project_id ON user_project_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_user_order ON user_project_preferences(user_id, order_index);

-- Show the final table structure
SELECT 'Final table structure:' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_project_preferences'
ORDER BY ordinal_position;

-- Test the table
SELECT 'Testing table access:' as info;
SELECT COUNT(*) as total_rows FROM user_project_preferences;

-- Run this SQL in your Supabase Dashboard SQL Editor to create the user_project_preferences table

-- Create user_project_preferences table
CREATE TABLE IF NOT EXISTS user_project_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE user_project_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own preferences only
CREATE POLICY "Users can manage their own project preferences"
  ON user_project_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_user_id ON user_project_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_project_id ON user_project_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_preferences_user_order ON user_project_preferences(user_id, order_index);

-- Verify the table was created
SELECT * FROM user_project_preferences LIMIT 0;

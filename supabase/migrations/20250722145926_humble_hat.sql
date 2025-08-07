/*
  # Create User Stories feature

  1. New Tables
    - `user_stories`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text, required)
      - `description` (text, optional)
      - `estimated_complexity` (integer, 1-10, default 5)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_story_roles`
      - `id` (uuid, primary key)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `user_role_id` (uuid, foreign key to user_roles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage user stories and roles

  3. Indexes
    - Add indexes for foreign keys and common queries
*/

-- Create user_stories table
CREATE TABLE IF NOT EXISTS user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  estimated_complexity integer DEFAULT 5 CHECK (estimated_complexity >= 1 AND estimated_complexity <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_story_roles junction table
CREATE TABLE IF NOT EXISTS user_story_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_story_id, user_role_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stories_project_id ON user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_story_roles_story_id ON user_story_roles(user_story_id);
CREATE INDEX IF NOT EXISTS idx_user_story_roles_role_id ON user_story_roles(user_role_id);

-- Enable Row Level Security
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_stories
CREATE POLICY "Allow authenticated users to manage user stories"
  ON user_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for user_story_roles
CREATE POLICY "Allow authenticated users to manage user story roles"
  ON user_story_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
/*
  # Create user_roles table

  1. New Tables
    - `user_roles`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, not null)
      - `description` (text, nullable)
      - `department` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_roles` table
    - Add policy for authenticated users to manage user roles
*/

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for workspace_id lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_workspace_id ON user_roles(workspace_id);

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage user roles
CREATE POLICY "Allow authenticated users to manage user roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
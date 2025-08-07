/*
  # Create tasks table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `project_id` (uuid, nullable, foreign key to projects)
      - `name` (text, required)
      - `description` (text, optional)
      - `status` (text, default 'not_complete')
      - `assigned_to_user_id` (uuid, nullable, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `tasks` table
    - Add policy for authenticated users to manage tasks
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text DEFAULT 'not_complete' NOT NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add constraint for status values
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('complete', 'not_complete', 'no_longer_required'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user_id ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
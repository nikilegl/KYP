/*
  # Create Project Progress Tables

  1. New Tables
    - `project_progress_status`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `question_key` (text, identifier for the question)
      - `is_completed` (boolean, completion status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `project_progress_comments`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `question_key` (text, identifier for the question)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text, the comment content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create project_progress_status table
CREATE TABLE IF NOT EXISTS project_progress_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, question_key)
);

-- Create project_progress_comments table
CREATE TABLE IF NOT EXISTS project_progress_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_progress_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_progress_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for project_progress_status
CREATE POLICY "Allow authenticated users to manage project progress status"
  ON project_progress_status
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for project_progress_comments
CREATE POLICY "Allow authenticated users to view all project progress comments"
  ON project_progress_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create project progress comments"
  ON project_progress_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own project progress comments"
  ON project_progress_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own project progress comments"
  ON project_progress_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_progress_status_project_id ON project_progress_status(project_id);
CREATE INDEX IF NOT EXISTS idx_project_progress_status_question_key ON project_progress_status(question_key);
CREATE INDEX IF NOT EXISTS idx_project_progress_comments_project_id ON project_progress_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_progress_comments_question_key ON project_progress_comments(question_key);
CREATE INDEX IF NOT EXISTS idx_project_progress_comments_user_id ON project_progress_comments(user_id);
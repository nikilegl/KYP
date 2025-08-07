/*
  # Create problem_overviews table

  1. New Tables
    - `problem_overviews`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `what_is_the_problem` (text)
      - `should_we_solve_it` (text)
      - `understanding_rating` (integer, 1-10)
      - `risk_level` (integer, 1-10)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `problem_overviews` table
    - Add policy for authenticated users to manage problem overviews
*/

CREATE TABLE IF NOT EXISTS problem_overviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  what_is_the_problem text DEFAULT '',
  should_we_solve_it text DEFAULT '',
  understanding_rating integer DEFAULT 5 CHECK (understanding_rating >= 1 AND understanding_rating <= 10),
  risk_level integer DEFAULT 5 CHECK (risk_level >= 1 AND risk_level <= 10),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE problem_overviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage problem overviews"
  ON problem_overviews
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_problem_overviews_project_id ON problem_overviews(project_id);
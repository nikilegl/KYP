/*
  # Create project_stakeholders table

  1. New Tables
    - `project_stakeholders`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `stakeholder_id` (uuid, foreign key to stakeholders)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `project_stakeholders` table
    - Add policy for authenticated users to manage project stakeholder assignments

  3. Constraints
    - Unique constraint on project_id + stakeholder_id to prevent duplicates
    - Foreign key constraints for data integrity
*/

CREATE TABLE IF NOT EXISTS project_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  stakeholder_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, stakeholder_id)
);

ALTER TABLE project_stakeholders ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_stakeholders_project_id_fkey'
  ) THEN
    ALTER TABLE project_stakeholders 
    ADD CONSTRAINT project_stakeholders_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_stakeholders_stakeholder_id_fkey'
  ) THEN
    ALTER TABLE project_stakeholders 
    ADD CONSTRAINT project_stakeholders_stakeholder_id_fkey 
    FOREIGN KEY (stakeholder_id) REFERENCES stakeholders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_project_id ON project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_stakeholder_id ON project_stakeholders(stakeholder_id);

-- RLS policies
CREATE POLICY "Allow authenticated users to manage project stakeholders"
  ON project_stakeholders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
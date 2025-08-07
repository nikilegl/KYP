/*
  # Simple KYD Platform Schema

  1. New Tables
    - `workspaces` - Main workspace entities
    - `projects` - Project management
    - `stakeholders` - Stakeholder management  
    - `research_notes` - Research notes

  2. Security
    - Enable RLS on all tables
    - Simple policies for authenticated users

  3. Features
    - UUID primary keys
    - Timestamps for audit trails
    - Simple relationships
*/

-- Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  overview text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Stakeholders table
CREATE TABLE IF NOT EXISTS stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Research notes table
CREATE TABLE IF NOT EXISTS research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_notes ENABLE ROW LEVEL SECURITY;

-- Simple policies - allow authenticated users to access everything for now
CREATE POLICY "Allow authenticated users" ON workspaces FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON projects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON stakeholders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON research_notes FOR ALL TO authenticated USING (true);

-- Create a default workspace
INSERT INTO workspaces (name, created_by) 
SELECT 'Default Workspace', id 
FROM auth.users 
WHERE email = 'niki@legl.com'
ON CONFLICT DO NOTHING;
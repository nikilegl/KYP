/*
  # Create assets table

  1. New Tables
    - `assets`
      - `id` (uuid, primary key)
      - `project_id` (uuid, foreign key to projects)
      - `name` (text, required)
      - `snapshot_image_url` (text, optional)
      - `description` (text, optional)
      - `link_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `assets` table
    - Add policy for authenticated users to manage assets

  3. Changes
    - Creates the assets table with proper constraints
    - Adds foreign key relationship to projects table
    - Sets up appropriate indexes for performance
*/

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  snapshot_image_url text,
  description text,
  link_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage assets
CREATE POLICY "Allow authenticated users to manage assets"
  ON assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assets_project_id ON assets(project_id);
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
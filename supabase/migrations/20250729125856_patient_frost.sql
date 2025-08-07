/*
  # Create note templates table

  1. New Tables
    - `note_templates`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, required)
      - `body` (text, rich text content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `note_templates` table
    - Add policy for authenticated users to manage their workspace templates
*/

CREATE TABLE IF NOT EXISTS note_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  body text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage note templates"
  ON note_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
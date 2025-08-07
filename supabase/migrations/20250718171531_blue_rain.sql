/*
  # Create law_firms table

  1. New Tables
    - `law_firms`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, required)
      - `location` (text, optional)
      - `contact_email` (text, optional)
      - `phone` (text, optional)
      - `website` (text, optional)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `law_firms` table
    - Add policy for authenticated users to manage law firms

  3. Performance
    - Add index on workspace_id for fast lookups
*/

CREATE TABLE IF NOT EXISTS law_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  contact_email text,
  phone text,
  website text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE law_firms ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_law_firms_workspace_id ON law_firms(workspace_id);

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to manage law firms"
  ON law_firms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
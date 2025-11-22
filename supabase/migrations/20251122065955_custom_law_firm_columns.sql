/*
  # Create law_firm_custom_columns table

  1. New Tables
    - `law_firm_custom_columns`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `column_key` (text, unique per workspace) - internal key like 'custom_field_1'
      - `column_name` (text, required) - display name like 'Top 10'
      - `column_type` (text, required) - 'boolean' or 'string'
      - `display_order` (integer, required) - order in which columns appear
      - `is_required` (boolean, default false) - whether column is required (name, structure are always required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `law_firm_custom_columns` table
    - Only workspace owners/admins can manage custom columns

  3. Performance
    - Add index on workspace_id and display_order for fast lookups
*/

CREATE TABLE IF NOT EXISTS law_firm_custom_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  column_key text NOT NULL,
  column_name text NOT NULL,
  column_type text NOT NULL CHECK (column_type IN ('boolean', 'string')),
  display_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, column_key)
);

-- Enable RLS
ALTER TABLE law_firm_custom_columns ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_columns_workspace_id ON law_firm_custom_columns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_columns_display_order ON law_firm_custom_columns(workspace_id, display_order);

-- RLS Policies
-- Users can view custom columns in their workspaces
CREATE POLICY "Users can view custom columns in their workspaces"
  ON law_firm_custom_columns
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only owners and admins can manage custom columns
CREATE POLICY "Owners and admins can manage custom columns"
  ON law_firm_custom_columns
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin') 
      AND status = 'active'
    )
  );

-- Create a table to store custom column values for each law firm
-- This uses JSONB to store dynamic column values
CREATE TABLE IF NOT EXISTS law_firm_custom_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  custom_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(law_firm_id)
);

-- Enable RLS
ALTER TABLE law_firm_custom_values ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_values_law_firm_id ON law_firm_custom_values(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_custom_values_workspace_id ON law_firm_custom_values(workspace_id);

-- RLS Policies for custom values
CREATE POLICY "Users can view custom values in their workspaces"
  ON law_firm_custom_values
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can manage custom values in their workspaces"
  ON law_firm_custom_values
  FOR ALL
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_law_firm_custom_columns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_law_firm_custom_columns_updated_at
  BEFORE UPDATE ON law_firm_custom_columns
  FOR EACH ROW
  EXECUTE FUNCTION update_law_firm_custom_columns_updated_at();

CREATE OR REPLACE FUNCTION update_law_firm_custom_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_law_firm_custom_values_updated_at
  BEFORE UPDATE ON law_firm_custom_values
  FOR EACH ROW
  EXECUTE FUNCTION update_law_firm_custom_values_updated_at();


-- Create third_parties table
CREATE TABLE IF NOT EXISTS third_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo text, -- SVG content or image URL
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS to the table
ALTER TABLE third_parties ENABLE ROW LEVEL SECURITY;

-- Policies for third_parties
CREATE POLICY "Enable read access for all users" ON "public"."third_parties" FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON "public"."third_parties" FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON "public"."third_parties" FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON "public"."third_parties" FOR DELETE USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_third_parties_workspace_id ON third_parties (workspace_id);
CREATE INDEX IF NOT EXISTS idx_third_parties_name ON third_parties (name);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_third_parties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_third_parties_updated_at
  BEFORE UPDATE ON third_parties
  FOR EACH ROW
  EXECUTE FUNCTION update_third_parties_updated_at();


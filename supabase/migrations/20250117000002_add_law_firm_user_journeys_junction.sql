-- Create law_firm_user_journeys junction table
CREATE TABLE IF NOT EXISTS law_firm_user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(law_firm_id, user_journey_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_law_firm_user_journeys_law_firm_id ON law_firm_user_journeys(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_law_firm_user_journeys_user_journey_id ON law_firm_user_journeys(user_journey_id);

-- Enable RLS
ALTER TABLE law_firm_user_journeys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view law_firm_user_journeys in their workspace"
  ON law_firm_user_journeys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM law_firms lf
      INNER JOIN workspaces w ON w.id = lf.workspace_id
      INNER JOIN workspace_users wu ON wu.workspace_id = w.id
      WHERE lf.id = law_firm_user_journeys.law_firm_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert law_firm_user_journeys in their workspace"
  ON law_firm_user_journeys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM law_firms lf
      INNER JOIN workspaces w ON w.id = lf.workspace_id
      INNER JOIN workspace_users wu ON wu.workspace_id = w.id
      WHERE lf.id = law_firm_user_journeys.law_firm_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete law_firm_user_journeys in their workspace"
  ON law_firm_user_journeys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM law_firms lf
      INNER JOIN workspaces w ON w.id = lf.workspace_id
      INNER JOIN workspace_users wu ON wu.workspace_id = w.id
      WHERE lf.id = law_firm_user_journeys.law_firm_id
      AND wu.user_id = auth.uid()
    )
  );


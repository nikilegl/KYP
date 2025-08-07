/*
  # Add stakeholder tagging to research notes

  1. New Tables
    - `research_note_stakeholders`
      - `id` (uuid, primary key)
      - `research_note_id` (uuid, foreign key to research_notes)
      - `stakeholder_id` (uuid, foreign key to stakeholders)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `research_note_stakeholders` table
    - Add policy for authenticated users to manage research note stakeholders
*/

CREATE TABLE IF NOT EXISTS research_note_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  stakeholder_id uuid NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(research_note_id, stakeholder_id)
);

ALTER TABLE research_note_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage research note stakeholders"
  ON research_note_stakeholders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_research_note_stakeholders_note_id 
  ON research_note_stakeholders(research_note_id);

CREATE INDEX IF NOT EXISTS idx_research_note_stakeholders_stakeholder_id 
  ON research_note_stakeholders(stakeholder_id);
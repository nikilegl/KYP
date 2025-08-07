/*
  # Add note links functionality

  1. New Tables
    - `note_links`
      - `id` (uuid, primary key)
      - `research_note_id` (uuid, foreign key)
      - `name` (text)
      - `url` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `note_links` table
    - Add policy for authenticated users to manage their note links
*/

CREATE TABLE IF NOT EXISTS note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage note links"
  ON note_links
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_note_links_research_note_id ON note_links(research_note_id);
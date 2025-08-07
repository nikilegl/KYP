/*
  # Create Asset Relationship Tables

  1. New Tables
    - `asset_user_stories`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `created_at` (timestamp)
    - `asset_research_notes`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `research_note_id` (uuid, foreign key to research_notes)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage relationships
*/

-- Create asset_user_stories table
CREATE TABLE IF NOT EXISTS asset_user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, user_story_id)
);

-- Create asset_research_notes table
CREATE TABLE IF NOT EXISTS asset_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(asset_id, research_note_id)
);

-- Enable RLS
ALTER TABLE asset_user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_research_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for asset_user_stories
CREATE POLICY "Allow authenticated users to manage asset user stories"
  ON asset_user_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policies for asset_research_notes
CREATE POLICY "Allow authenticated users to manage asset research notes"
  ON asset_research_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_asset_user_stories_asset_id ON asset_user_stories(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_user_stories_user_story_id ON asset_user_stories(user_story_id);
CREATE INDEX IF NOT EXISTS idx_asset_research_notes_asset_id ON asset_research_notes(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_research_notes_research_note_id ON asset_research_notes(research_note_id);
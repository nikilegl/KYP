/*
  # Create themes and theme association tables

  1. New Tables
    - `themes`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text, unique per workspace)
      - `description` (text, optional)
      - `color` (text, default blue)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `theme_user_stories`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `created_at` (timestamp)
    - `theme_user_journeys`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `created_at` (timestamp)
    - `theme_research_notes`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `research_note_id` (uuid, foreign key to research_notes)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage themes and associations

  3. Indexes
    - Add indexes for foreign keys and unique constraints
    - Add composite unique constraints for junction tables
*/

-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Create theme_user_stories junction table
CREATE TABLE IF NOT EXISTS theme_user_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, user_story_id)
);

-- Create theme_user_journeys junction table
CREATE TABLE IF NOT EXISTS theme_user_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, user_journey_id)
);

-- Create theme_research_notes junction table
CREATE TABLE IF NOT EXISTS theme_research_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  research_note_id uuid NOT NULL REFERENCES research_notes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, research_note_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_themes_workspace_id ON themes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_themes_created_at ON themes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_theme_user_stories_theme_id ON theme_user_stories(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_user_stories_user_story_id ON theme_user_stories(user_story_id);

CREATE INDEX IF NOT EXISTS idx_theme_user_journeys_theme_id ON theme_user_journeys(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_user_journeys_user_journey_id ON theme_user_journeys(user_journey_id);

CREATE INDEX IF NOT EXISTS idx_theme_research_notes_theme_id ON theme_research_notes(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_research_notes_research_note_id ON theme_research_notes(research_note_id);

-- Enable Row Level Security
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_research_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for themes
CREATE POLICY "Allow authenticated users to manage themes"
  ON themes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for theme_user_stories
CREATE POLICY "Allow authenticated users to manage theme user stories"
  ON theme_user_stories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for theme_user_journeys
CREATE POLICY "Allow authenticated users to manage theme user journeys"
  ON theme_user_journeys
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for theme_research_notes
CREATE POLICY "Allow authenticated users to manage theme research notes"
  ON theme_research_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
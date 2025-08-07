/*
  # Add short IDs for user-friendly URLs

  1. New Columns
    - Add `short_id` column to projects, stakeholders, research_notes, user_journeys, user_stories tables
    - Each short_id is auto-incrementing integer, unique per table
    - Used for user-friendly URLs instead of UUIDs

  2. Sequences
    - Create sequences for each table to generate unique short IDs
    - Start from 1 for each entity type

  3. Data Migration
    - Populate short_id for existing records
    - Set up triggers for auto-generation on new records

  4. Indexes
    - Add unique indexes on short_id columns for fast lookups
*/

-- Create sequences for short IDs
CREATE SEQUENCE IF NOT EXISTS projects_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS stakeholders_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS research_notes_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS user_journeys_short_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS user_stories_short_id_seq START 1;

-- Add short_id columns to tables
DO $$
BEGIN
  -- Projects table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN short_id integer UNIQUE DEFAULT nextval('projects_short_id_seq');
  END IF;

  -- Stakeholders table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN short_id integer UNIQUE DEFAULT nextval('stakeholders_short_id_seq');
  END IF;

  -- Research notes table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN short_id integer UNIQUE DEFAULT nextval('research_notes_short_id_seq');
  END IF;

  -- User journeys table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN short_id integer UNIQUE DEFAULT nextval('user_journeys_short_id_seq');
  END IF;

  -- User stories table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_stories' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE user_stories ADD COLUMN short_id integer UNIQUE DEFAULT nextval('user_stories_short_id_seq');
  END IF;
END $$;

-- Populate short_id for existing records
UPDATE projects SET short_id = nextval('projects_short_id_seq') WHERE short_id IS NULL;
UPDATE stakeholders SET short_id = nextval('stakeholders_short_id_seq') WHERE short_id IS NULL;
UPDATE research_notes SET short_id = nextval('research_notes_short_id_seq') WHERE short_id IS NULL;
UPDATE user_journeys SET short_id = nextval('user_journeys_short_id_seq') WHERE short_id IS NULL;
UPDATE user_stories SET short_id = nextval('user_stories_short_id_seq') WHERE short_id IS NULL;

-- Make short_id NOT NULL after populating existing records
ALTER TABLE projects ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE stakeholders ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE research_notes ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE user_journeys ALTER COLUMN short_id SET NOT NULL;
ALTER TABLE user_stories ALTER COLUMN short_id SET NOT NULL;

-- Create indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_short_id ON projects(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stakeholders_short_id ON stakeholders(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_notes_short_id ON research_notes(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_journeys_short_id ON user_journeys(short_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stories_short_id ON user_stories(short_id);
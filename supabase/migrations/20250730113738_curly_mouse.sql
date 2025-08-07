/*
  # Add asset comments and theme assets tables

  1. New Tables
    - `asset_comments`
      - `id` (uuid, primary key)
      - `asset_id` (uuid, foreign key to assets)
      - `user_id` (uuid, foreign key to users)
      - `comment_text` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `theme_assets`
      - `id` (uuid, primary key)
      - `theme_id` (uuid, foreign key to themes)
      - `asset_id` (uuid, foreign key to assets)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage comments and theme links
  
  3. Changes
    - Add short_id to assets table for URL routing
    - Add indexes for performance
*/

-- Add short_id column to assets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE assets ADD COLUMN short_id integer;
  END IF;
END $$;

-- Create sequence for assets short_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'assets_short_id_seq') THEN
    CREATE SEQUENCE assets_short_id_seq;
  END IF;
END $$;

-- Set default value for short_id and make it unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'short_id' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE assets ALTER COLUMN short_id SET DEFAULT nextval('assets_short_id_seq'::regclass);
  END IF;
END $$;

-- Update existing assets with short_id values
UPDATE assets SET short_id = nextval('assets_short_id_seq'::regclass) WHERE short_id IS NULL;

-- Make short_id NOT NULL and add unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assets' AND column_name = 'short_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE assets ALTER COLUMN short_id SET NOT NULL;
  END IF;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'assets' AND constraint_name = 'assets_short_id_key'
  ) THEN
    ALTER TABLE assets ADD CONSTRAINT assets_short_id_key UNIQUE (short_id);
  END IF;
END $$;

-- Create asset_comments table
CREATE TABLE IF NOT EXISTS asset_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create theme_assets table
CREATE TABLE IF NOT EXISTS theme_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(theme_id, asset_id)
);

-- Enable RLS on asset_comments
ALTER TABLE asset_comments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on theme_assets
ALTER TABLE theme_assets ENABLE ROW LEVEL SECURITY;

-- Policies for asset_comments
CREATE POLICY "Allow authenticated users to view all asset comments"
  ON asset_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create asset comments"
  ON asset_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own asset comments"
  ON asset_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own asset comments"
  ON asset_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for theme_assets
CREATE POLICY "Allow authenticated users to manage theme assets"
  ON theme_assets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_short_id ON assets(short_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_user_id ON asset_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_comments_created_at ON asset_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_theme_assets_theme_id ON theme_assets(theme_id);
CREATE INDEX IF NOT EXISTS idx_theme_assets_asset_id ON theme_assets(asset_id);
/*
  # Add Research Note Comments Table

  1. New Tables
    - `research_note_comments`
      - `id` (uuid, primary key)
      - `research_note_id` (uuid, foreign key to research_notes)
      - `user_id` (uuid, foreign key to users via auth.uid())
      - `comment_text` (text, required)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `research_note_comments` table
    - Add policy for authenticated users to create comments (with their own user_id)
    - Add policy for authenticated users to view all comments
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments

  3. Indexes
    - Index on `research_note_id` for efficient comment retrieval
    - Index on `user_id` for user-specific queries
    - Index on `created_at` for chronological ordering
*/

-- Create the research_note_comments table
CREATE TABLE IF NOT EXISTS research_note_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_note_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'research_note_comments_research_note_id_fkey'
  ) THEN
    ALTER TABLE research_note_comments 
    ADD CONSTRAINT research_note_comments_research_note_id_fkey 
    FOREIGN KEY (research_note_id) REFERENCES research_notes(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'research_note_comments_user_id_fkey'
  ) THEN
    ALTER TABLE research_note_comments 
    ADD CONSTRAINT research_note_comments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_research_note_comments_research_note_id 
ON research_note_comments(research_note_id);

CREATE INDEX IF NOT EXISTS idx_research_note_comments_user_id 
ON research_note_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_research_note_comments_created_at 
ON research_note_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE research_note_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow authenticated users to create comments (with their own user_id)
CREATE POLICY "Allow authenticated users to create research note comments"
  ON research_note_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Allow authenticated users to view all research note comments"
  ON research_note_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own comments
CREATE POLICY "Allow users to update their own research note comments"
  ON research_note_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete their own research note comments"
  ON research_note_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
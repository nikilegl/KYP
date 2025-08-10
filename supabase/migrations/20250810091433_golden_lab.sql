/*
  # Create research_note_comments table

  1. New Tables
    - `research_note_comments`
      - `id` (uuid, primary key)
      - `research_note_id` (uuid, foreign key to research_notes.id)
      - `user_id` (uuid, foreign key to auth.users.id)
      - `comment_text` (text, required)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `research_note_comments` table
    - Add policy for authenticated users to view all comments
    - Add policy for authenticated users to create comments (own user_id only)
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments

  3. Indexes
    - Primary key index on `id`
    - Index on `research_note_id` for efficient lookups
    - Index on `user_id` for efficient user-based queries
    - Index on `created_at` for efficient ordering
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
ALTER TABLE research_note_comments 
ADD CONSTRAINT research_note_comments_research_note_id_fkey 
FOREIGN KEY (research_note_id) REFERENCES research_notes(id) ON DELETE CASCADE;

ALTER TABLE research_note_comments 
ADD CONSTRAINT research_note_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_research_note_comments_research_note_id 
ON research_note_comments(research_note_id);

CREATE INDEX IF NOT EXISTS idx_research_note_comments_user_id 
ON research_note_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_research_note_comments_created_at 
ON research_note_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE research_note_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated users to view all research note comments"
  ON research_note_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create research note comments"
  ON research_note_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own research note comments"
  ON research_note_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own research note comments"
  ON research_note_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
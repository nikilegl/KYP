/*
  # Create user story comments table

  1. New Tables
    - `user_story_comments`
      - `id` (uuid, primary key)
      - `user_story_id` (uuid, foreign key to user_stories)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_story_comments` table
    - Add policy for authenticated users to create comments (only their own)
    - Add policy for authenticated users to view all comments
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments

  3. Indexes
    - Index on user_story_id for efficient querying
    - Index on user_id for user-specific queries
    - Index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS user_story_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_id uuid NOT NULL REFERENCES user_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_story_comments ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_story_comments_user_story_id ON user_story_comments(user_story_id);
CREATE INDEX IF NOT EXISTS idx_user_story_comments_user_id ON user_story_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_story_comments_created_at ON user_story_comments(created_at DESC);

-- RLS Policies

-- Allow authenticated users to create comments (only their own)
CREATE POLICY "Allow authenticated users to create user story comments"
  ON user_story_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Allow authenticated users to view all user story comments"
  ON user_story_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own comments
CREATE POLICY "Allow users to update their own user story comments"
  ON user_story_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete their own user story comments"
  ON user_story_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
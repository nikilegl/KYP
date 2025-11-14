/*
  # Create user journey comments table

  1. New Tables
    - `user_journey_comments`
      - `id` (uuid, primary key)
      - `user_journey_id` (uuid, foreign key to user_journeys)
      - `user_id` (uuid, foreign key to auth.users)
      - `comment_text` (text, not null)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_journey_comments` table
    - Add policy for authenticated users to create comments (only their own)
    - Add policy for authenticated users to view all comments
    - Add policy for users to update their own comments
    - Add policy for users to delete their own comments

  3. Indexes
    - Index on user_journey_id for efficient querying
    - Index on user_id for user-specific queries
    - Index on created_at for chronological ordering
*/

CREATE TABLE IF NOT EXISTS user_journey_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_journey_id uuid NOT NULL REFERENCES user_journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_journey_comments ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_journey_comments_user_journey_id ON user_journey_comments(user_journey_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_comments_user_id ON user_journey_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_journey_comments_created_at ON user_journey_comments(created_at DESC);

-- RLS Policies

-- Allow authenticated users to create comments (only their own)
CREATE POLICY "Allow authenticated users to create user journey comments"
  ON user_journey_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view all comments
CREATE POLICY "Allow authenticated users to view all user journey comments"
  ON user_journey_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own comments
CREATE POLICY "Allow users to update their own user journey comments"
  ON user_journey_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete their own user journey comments"
  ON user_journey_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);



/*
  # Allow Public Access to Published User Journeys
  
  This migration adds an RLS policy that allows anonymous (unauthenticated) users
  to read published user journeys. This enables public sharing of user journeys.
*/

-- Drop existing policy if it exists (we'll recreate it with better name)
DROP POLICY IF EXISTS "Allow authenticated users to manage user journeys" ON user_journeys;

-- Create policy for authenticated users (full access)
CREATE POLICY "Allow authenticated users to manage user journeys"
  ON user_journeys
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for anonymous users (read-only access to published journeys)
CREATE POLICY "Allow anonymous users to read published journeys"
  ON user_journeys
  FOR SELECT
  TO anon
  USING (status = 'published');


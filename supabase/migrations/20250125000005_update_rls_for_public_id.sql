/*
  # Update RLS policy to allow public access via public_id
  
  This migration ensures that anonymous users can access user journeys via their public_id.
  The existing policy already allows anonymous access, but we want to make sure it works
  with the new public_id column.
*/

-- The existing policy "Allow anonymous users to read journeys via public link" 
-- already allows anonymous users to read all journeys (USING (true))
-- So no changes are needed to the RLS policy itself.

-- However, we should verify the policy exists and is correct
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_journeys' 
    AND policyname = 'Allow anonymous users to read journeys via public link'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Allow anonymous users to read journeys via public link"
      ON user_journeys
      FOR SELECT
      TO anon
      USING (true);
    RAISE NOTICE 'Created RLS policy for anonymous users to read journeys via public link';
  ELSE
    RAISE NOTICE 'RLS policy for anonymous users already exists';
  END IF;
END $$;


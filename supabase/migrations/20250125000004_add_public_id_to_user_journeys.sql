/*
  # Add secure public_id to user_journeys
  
  This migration adds a secure, unguessable public_id column for public sharing URLs.
  The public_id is a UUID that cannot be guessed, providing security for public links.
  
  1. Changes
    - Add public_id column (UUID, nullable, unique)
    - Create unique index for fast lookups
    - Generate public_id for existing journeys (optional, can be done on-demand)
*/

-- Add public_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'public_id'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN public_id uuid UNIQUE DEFAULT gen_random_uuid();
    RAISE NOTICE 'Added public_id column to user_journeys';
  ELSE
    RAISE NOTICE 'public_id column already exists in user_journeys';
  END IF;
END $$;

-- Generate public_id for existing records that don't have one (optional, can be done on-demand)
UPDATE user_journeys 
SET public_id = gen_random_uuid()
WHERE public_id IS NULL;

-- Create unique index for fast lookups if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_journeys_public_id ON user_journeys(public_id);


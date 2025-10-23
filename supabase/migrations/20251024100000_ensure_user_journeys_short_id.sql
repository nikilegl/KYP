/*
  # Ensure user_journeys has short_id column
  
  This migration ensures the user_journeys table has a short_id column for user-friendly URLs.
  It's safe to run multiple times (idempotent).
  
  1. Changes
    - Create sequence for user journey short IDs if it doesn't exist
    - Add short_id column to user_journeys if it doesn't exist
    - Populate short_id for existing records
    - Create unique index for fast lookups
*/

-- Create sequence for short IDs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_journeys_short_id_seq') THEN
    CREATE SEQUENCE user_journeys_short_id_seq START 1;
    RAISE NOTICE 'Created user_journeys_short_id_seq sequence';
  ELSE
    RAISE NOTICE 'user_journeys_short_id_seq sequence already exists';
  END IF;
END $$;

-- Add short_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'short_id'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN short_id integer UNIQUE DEFAULT nextval('user_journeys_short_id_seq');
    RAISE NOTICE 'Added short_id column to user_journeys';
  ELSE
    RAISE NOTICE 'short_id column already exists in user_journeys';
  END IF;
END $$;

-- Populate short_id for existing records that don't have one
UPDATE user_journeys 
SET short_id = nextval('user_journeys_short_id_seq') 
WHERE short_id IS NULL;

-- Make short_id NOT NULL after populating existing records
DO $$
BEGIN
  -- Check if the column is already NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' 
    AND column_name = 'short_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE user_journeys ALTER COLUMN short_id SET NOT NULL;
    RAISE NOTICE 'Set short_id to NOT NULL';
  ELSE
    RAISE NOTICE 'short_id is already NOT NULL';
  END IF;
END $$;

-- Create unique index for fast lookups if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_journeys_short_id ON user_journeys(short_id);

-- Verify the result
DO $$
DECLARE
  column_exists boolean;
  index_exists boolean;
  sequence_exists boolean;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'short_id'
  ) INTO column_exists;
  
  -- Check if index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'user_journeys' AND indexname = 'idx_user_journeys_short_id'
  ) INTO index_exists;
  
  -- Check if sequence exists
  SELECT EXISTS (
    SELECT 1 FROM pg_sequences
    WHERE schemaname = 'public' AND sequencename = 'user_journeys_short_id_seq'
  ) INTO sequence_exists;
  
  RAISE NOTICE '=== Migration Status ===';
  RAISE NOTICE 'short_id column exists: %', column_exists;
  RAISE NOTICE 'short_id index exists: %', index_exists;
  RAISE NOTICE 'short_id sequence exists: %', sequence_exists;
  
  IF NOT column_exists OR NOT index_exists OR NOT sequence_exists THEN
    RAISE EXCEPTION 'Migration verification failed!';
  END IF;
END $$;


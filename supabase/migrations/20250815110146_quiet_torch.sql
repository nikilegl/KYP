/*
  # Add short_id column to law_firms table

  1. New Column
    - `short_id` (integer, unique, not null)
    - Auto-incrementing sequence for new records
    - Populated for all existing records

  2. Indexes
    - Unique index on short_id for fast lookups
    - Sequence for auto-generation

  3. Constraints
    - Unique constraint on short_id
    - Not null constraint
*/

-- Add the short_id column to the law_firms table
ALTER TABLE public.law_firms
ADD COLUMN IF NOT EXISTS short_id INTEGER;

-- Create a sequence for generating unique short_id values
CREATE SEQUENCE IF NOT EXISTS public.law_firms_short_id_seq
START WITH 1
INCREMENT BY 1
NO MINVALUE
NO MAXVALUE
CACHE 1;

-- Populate the short_id column for existing rows
UPDATE public.law_firms
SET short_id = nextval('public.law_firms_short_id_seq')
WHERE short_id IS NULL;

-- Set the default value for new rows to use the sequence
ALTER TABLE public.law_firms
ALTER COLUMN short_id SET DEFAULT nextval('public.law_firms_short_id_seq');

-- Add a unique constraint to the short_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'law_firms' AND constraint_name = 'law_firms_short_id_key'
  ) THEN
    ALTER TABLE public.law_firms
    ADD CONSTRAINT law_firms_short_id_key UNIQUE (short_id);
  END IF;
END $$;

-- Make the short_id column NOT NULL
ALTER TABLE public.law_firms
ALTER COLUMN short_id SET NOT NULL;

-- Create an index on the short_id column for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_law_firms_short_id ON public.law_firms (short_id);
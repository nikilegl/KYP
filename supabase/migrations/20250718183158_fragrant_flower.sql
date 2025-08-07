/*
  # Update Law Firms table structure

  1. Changes
    - Remove location, contact_email, phone, website columns
    - Add structure column with 'centralised' or 'decentralised' values
    - Update existing data to use new structure

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Add the new structure column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'structure'
  ) THEN
    ALTER TABLE law_firms ADD COLUMN structure text NOT NULL DEFAULT 'centralised';
  END IF;
END $$;

-- Add constraint for structure values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'law_firms_structure_check'
  ) THEN
    ALTER TABLE law_firms ADD CONSTRAINT law_firms_structure_check 
    CHECK (structure = ANY (ARRAY['centralised'::text, 'decentralised'::text]));
  END IF;
END $$;

-- Remove old columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'location'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN location;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN contact_email;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'phone'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN phone;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'website'
  ) THEN
    ALTER TABLE law_firms DROP COLUMN website;
  END IF;
END $$;
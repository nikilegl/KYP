/*
  # Add Law Firm association to Stakeholders

  1. Schema Changes
    - Add `law_firm_id` column to `stakeholders` table
    - Add foreign key constraint to `law_firms` table
    - Make it optional (nullable) for backward compatibility

  2. Security
    - No changes to RLS policies needed as they inherit from existing stakeholder policies
*/

-- Add law_firm_id column to stakeholders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'law_firm_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN law_firm_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stakeholders_law_firm_id_fkey'
  ) THEN
    ALTER TABLE stakeholders 
    ADD CONSTRAINT stakeholders_law_firm_id_fkey 
    FOREIGN KEY (law_firm_id) REFERENCES law_firms(id) ON DELETE SET NULL;
  END IF;
END $$;
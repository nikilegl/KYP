/*
  # Add notes column to stakeholders table

  1. Schema Changes
    - Add `notes` column to `stakeholders` table (text type, nullable)
    - Column will store rich text notes about stakeholders

  2. Security
    - No additional RLS policies needed as existing policies cover all operations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN notes text;
  END IF;
END $$;
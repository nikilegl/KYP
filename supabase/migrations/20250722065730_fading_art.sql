/*
  # Add is_decision column to research_notes table

  1. Changes
    - Add `is_decision` boolean column to `research_notes` table with default value false
    - This column will track whether a research note represents a decision

  2. Security
    - No RLS changes needed as the table already has proper policies
*/

-- Add is_decision column to research_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'is_decision'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN is_decision boolean DEFAULT false NOT NULL;
  END IF;
END $$;
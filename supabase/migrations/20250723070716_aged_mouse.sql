/*
  # Add decision_text column to research_notes table

  1. Schema Changes
    - Add `decision_text` column to `research_notes` table
    - Column is nullable TEXT type to store single-line decision text

  2. Notes
    - This replaces the boolean `is_decision` field with a more flexible text field
    - Existing `is_decision` column remains for backward compatibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'decision_text'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN decision_text TEXT;
  END IF;
END $$;
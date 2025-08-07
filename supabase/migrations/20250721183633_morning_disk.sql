/*
  # Add note_date column to research_notes table

  1. Changes
    - Add `note_date` column to `research_notes` table
    - Column is nullable to allow existing notes without dates
    - Uses `date` type for storing just the date (no time component)

  2. Notes
    - Existing research notes will have NULL note_date initially
    - New notes can specify a custom date
    - Applications can fall back to created_at if note_date is NULL
*/

-- Add note_date column to research_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'research_notes' AND column_name = 'note_date'
  ) THEN
    ALTER TABLE research_notes ADD COLUMN note_date date;
  END IF;
END $$;
/*
  # Add native_notes column to research_notes table

  1. Changes
    - Add `native_notes` column to `research_notes` table
    - Column type: TEXT (allows for long-form notes)
    - Column is nullable to maintain compatibility with existing records

  2. Notes
    - This enables storing detailed native notes alongside research note summaries
    - Existing records will have NULL values for native_notes initially
*/

-- Add native_notes column to research_notes table
ALTER TABLE research_notes ADD COLUMN IF NOT EXISTS native_notes TEXT;
/*
  # Update decision_text to support multiple decisions

  1. Schema Changes
    - Alter `decision_text` column in `research_notes` table to be TEXT[] (array of text)
    - This allows storing multiple decision strings per note

  2. Data Migration
    - Convert existing single decision_text values to arrays
    - Handle null values appropriately
*/

-- First, add a new column for the array
ALTER TABLE research_notes ADD COLUMN IF NOT EXISTS decision_text_array TEXT[];

-- Migrate existing data: convert single strings to single-item arrays
UPDATE research_notes 
SET decision_text_array = CASE 
  WHEN decision_text IS NOT NULL AND decision_text != '' THEN ARRAY[decision_text]
  ELSE NULL
END;

-- Drop the old column
ALTER TABLE research_notes DROP COLUMN IF EXISTS decision_text;

-- Rename the new column to the original name
ALTER TABLE research_notes RENAME COLUMN decision_text_array TO decision_text;
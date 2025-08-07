/*
  # Add new fields to stakeholders table

  1. New Columns
    - `visitor_id` (text, optional) - Unique identifier for visitor tracking
    - `department` (text, optional) - Department the stakeholder belongs to
    - `pendo_role` (text, optional) - Role identifier for Pendo analytics

  2. Changes
    - Add three new optional text columns to stakeholders table
    - All fields are nullable to maintain compatibility with existing data
*/

-- Add new fields to stakeholders table
DO $$
BEGIN
  -- Add visitor_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'visitor_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN visitor_id text;
  END IF;

  -- Add department column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'department'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN department text;
  END IF;

  -- Add pendo_role column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'pendo_role'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN pendo_role text;
  END IF;
END $$;
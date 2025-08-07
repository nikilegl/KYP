/*
  # Add top_4 column to law_firms table

  1. New Columns
    - `top_4` (boolean, default false) - Indicates if the law firm is in the top 4

  2. Changes
    - Added top_4 column to law_firms table with default value of false
    - This allows tracking which law firms are considered "top 4" firms

  3. Security
    - No RLS changes needed as existing policies will cover the new column
*/

-- Add top_4 column to law_firms table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'law_firms' AND column_name = 'top_4'
  ) THEN
    ALTER TABLE law_firms ADD COLUMN top_4 boolean DEFAULT false;
  END IF;
END $$;
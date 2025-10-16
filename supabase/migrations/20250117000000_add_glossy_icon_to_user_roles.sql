/*
  # Add glossy_icon column to user_roles table

  1. Changes
    - Add glossy_icon column to user_roles table to store SVG content
    - The column is nullable (optional field)
    - Uses text type to store SVG markup
*/

-- Add glossy_icon column to user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'glossy_icon'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN glossy_icon text;
  END IF;
END $$;


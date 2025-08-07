/*
  # Add colour column to user_roles table

  1. Schema Changes
    - Add `colour` column to `user_roles` table
      - `colour` (text, not null, default '#6B7280')
  
  2. Notes
    - Default color is set to gray (#6B7280) for existing records
    - Column is required (NOT NULL) as all user roles should have a color
*/

-- Add colour column to user_roles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'colour'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN colour text NOT NULL DEFAULT '#6B7280';
  END IF;
END $$;
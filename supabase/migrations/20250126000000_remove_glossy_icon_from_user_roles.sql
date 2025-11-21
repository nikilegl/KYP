/*
  # Remove glossy_icon column from user_roles table

  1. Changes
    - Remove glossy_icon column from user_roles table
    - This column is no longer needed as we're using emoji icons instead
*/

-- Remove glossy_icon column from user_roles table
ALTER TABLE user_roles DROP COLUMN IF EXISTS glossy_icon;


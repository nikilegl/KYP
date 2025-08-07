/*
  # Add icon field to user_roles table

  1. Changes
    - Add `icon` column to `user_roles` table to store MaterialUI icon names
    - Column is optional (nullable) for backward compatibility

  2. Security
    - No changes to RLS policies needed
*/

ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS icon text;
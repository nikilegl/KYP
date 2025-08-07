/*
  # Add User Role to Stakeholders

  1. Changes
    - Add `user_role_id` column to `stakeholders` table
    - Add foreign key constraint to `user_roles` table
    - Allow null values for existing stakeholders

  2. Security
    - No changes to RLS policies needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stakeholders' AND column_name = 'user_role_id'
  ) THEN
    ALTER TABLE stakeholders ADD COLUMN user_role_id uuid REFERENCES user_roles(id) ON DELETE SET NULL;
  END IF;
END $$;
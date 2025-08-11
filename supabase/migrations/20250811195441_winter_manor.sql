/*
  # Fix user project preferences unique constraint

  1. Changes
    - Add unique constraint on (user_id, project_id) to support upsert operations
    - This constraint is required for the ON CONFLICT clause in the drag-and-drop functionality

  2. Security
    - No changes to existing RLS policies
    - Maintains data integrity for project ordering preferences
*/

-- Add the unique constraint that the upsert operation expects
ALTER TABLE user_project_preferences 
ADD CONSTRAINT user_project_preferences_user_id_project_id_key 
UNIQUE (user_id, project_id);
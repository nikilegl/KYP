/*
  # Rename Groups to Folders
  
  This migration renames:
  - user_journey_groups -> user_journey_folders
  - group_id -> folder_id
*/

-- Rename the table
ALTER TABLE user_journey_groups RENAME TO user_journey_folders;

-- Rename the column in user_journeys table
ALTER TABLE user_journeys RENAME COLUMN group_id TO folder_id;

-- Rename indexes
ALTER INDEX idx_user_journey_groups_workspace_id RENAME TO idx_user_journey_folders_workspace_id;
ALTER INDEX idx_user_journeys_group_id RENAME TO idx_user_journeys_folder_id;

-- Update table comment
COMMENT ON TABLE user_journey_folders IS 'Folders for organizing user journeys within a workspace';

-- Update column comment
COMMENT ON COLUMN user_journeys.folder_id IS 'Optional folder assignment for organizing user journeys';


/*
  # Make project_id optional for user journeys
  
  1. Changes
    - Make project_id nullable in user_journeys table
    - User journeys can now exist independently without a project
*/

-- Make project_id nullable
ALTER TABLE user_journeys 
  ALTER COLUMN project_id DROP NOT NULL;


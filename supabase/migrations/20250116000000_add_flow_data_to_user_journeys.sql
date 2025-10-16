/*
  # Add React Flow data support to user_journeys
  
  1. Changes
    - Add description column to user_journeys
    - Add flow_data column to store React Flow nodes and edges as JSONB
    - The flow_data will store: { nodes: [], edges: [] }
  
  This allows storing the visual flow diagram data separately from the legacy node structure
*/

-- Add description column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'description'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

-- Add flow_data column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_journeys' AND column_name = 'flow_data'
  ) THEN
    ALTER TABLE user_journeys ADD COLUMN flow_data jsonb DEFAULT '{"nodes": [], "edges": []}'::jsonb;
  END IF;
END $$;


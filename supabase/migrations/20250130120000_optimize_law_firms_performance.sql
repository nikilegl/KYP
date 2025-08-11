/*
  # Optimize law_firms table performance

  1. Performance Improvements
    - Add index on created_at for fast ORDER BY operations
    - Add composite index for workspace_id + created_at for filtered queries
    - Consider partial indexes for active firms

  2. Benefits
    - Faster ORDER BY created_at DESC queries
    - Improved pagination performance
    - Better performance for workspace-filtered queries
*/

-- Add index on created_at for ORDER BY performance
CREATE INDEX IF NOT EXISTS idx_law_firms_created_at ON law_firms(created_at DESC);

-- Add composite index for workspace_id + created_at for filtered queries
CREATE INDEX IF NOT EXISTS idx_law_firms_workspace_created_at ON law_firms(workspace_id, created_at DESC);

-- Add partial index for active firms only (if most queries filter by status)
CREATE INDEX IF NOT EXISTS idx_law_firms_active_created_at ON law_firms(created_at DESC) WHERE status = 'active';

-- Add index on name for search operations
CREATE INDEX IF NOT EXISTS idx_law_firms_name ON law_firms(name);

-- Add index on structure for filtering
CREATE INDEX IF NOT EXISTS idx_law_firms_structure ON law_firms(structure);

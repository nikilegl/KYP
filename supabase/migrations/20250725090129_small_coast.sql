/*
  # Add research_note_id to tasks table

  1. Schema Changes
    - Add `research_note_id` column to `tasks` table (uuid, nullable)
    - Add foreign key constraint referencing `research_notes.id`
    - Add index on `research_note_id` for query performance

  2. Security
    - No changes to RLS policies needed as tasks inherit project-level access
*/

-- Add research_note_id column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'research_note_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN research_note_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_research_note_id_fkey'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_research_note_id_fkey 
    FOREIGN KEY (research_note_id) REFERENCES research_notes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_tasks_research_note_id'
  ) THEN
    CREATE INDEX idx_tasks_research_note_id ON tasks(research_note_id);
  END IF;
END $$;
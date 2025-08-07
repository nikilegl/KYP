/*
  # Add user_story_id column to tasks table

  1. Schema Changes
    - Add `user_story_id` column to `tasks` table
    - Add foreign key constraint to `user_stories` table
    - Add index for efficient querying

  2. Security
    - Maintain existing RLS policies
*/

-- Add user_story_id column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'user_story_id'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN user_story_id uuid NULL;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_user_story_id_fkey'
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_user_story_id_fkey
    FOREIGN KEY (user_story_id) REFERENCES public.user_stories(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for efficient querying
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_tasks_user_story_id'
  ) THEN
    CREATE INDEX idx_tasks_user_story_id ON public.tasks USING btree (user_story_id);
  END IF;
END $$;
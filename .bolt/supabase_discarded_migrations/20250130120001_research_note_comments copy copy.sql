-- Create research_note_comments table
CREATE TABLE IF NOT EXISTS research_note_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  research_note_id uuid NOT NULL,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  is_decision boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE research_note_comments 
ADD CONSTRAINT research_note_comments_research_note_id_fkey 
FOREIGN KEY (research_note_id) REFERENCES research_notes(id) ON DELETE CASCADE;

ALTER TABLE research_note_comments 
ADD CONSTRAINT research_note_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_research_note_comments_research_note_id 
ON research_note_comments(research_note_id);

CREATE INDEX IF NOT EXISTS idx_research_note_comments_user_id 
ON research_note_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_research_note_comments_created_at 
ON research_note_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_note_comments_is_decision 
ON research_note_comments(is_decision);

-- Enable Row Level Security
ALTER TABLE research_note_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to create research note comments" 
ON research_note_comments FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to view all research note comments" 
ON research_note_comments FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Allow users to update their own research note comments" 
ON research_note_comments FOR UPDATE TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own research note comments" 
ON research_note_comments FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- AI Processing Jobs Table
-- Stores background job status for long-running AI operations (transcript/image import)

CREATE TABLE IF NOT EXISTS ai_processing_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('transcript', 'diagram')),
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')) DEFAULT 'processing',
  input_data jsonb NOT NULL, -- Store transcript text or image metadata
  result_data jsonb, -- Store the AI-generated journey data
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS ai_processing_jobs_user_id_idx ON ai_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS ai_processing_jobs_status_idx ON ai_processing_jobs(status);
CREATE INDEX IF NOT EXISTS ai_processing_jobs_created_at_idx ON ai_processing_jobs(created_at);

-- RLS Policies
ALTER TABLE ai_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own jobs
CREATE POLICY "Users can view their own AI processing jobs"
  ON ai_processing_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create jobs
CREATE POLICY "Users can create AI processing jobs"
  ON ai_processing_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cleanup old jobs (older than 7 days)
-- This keeps the table from growing indefinitely
CREATE OR REPLACE FUNCTION cleanup_old_ai_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_processing_jobs
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run cleanup weekly (you can set this up as a cron job in Supabase)
COMMENT ON FUNCTION cleanup_old_ai_jobs() IS 'Deletes AI processing jobs older than 7 days';


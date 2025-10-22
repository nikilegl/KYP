-- Add 'edit-journey' to allowed job types for ai_processing_jobs
ALTER TABLE ai_processing_jobs 
DROP CONSTRAINT IF EXISTS ai_processing_jobs_job_type_check;

ALTER TABLE ai_processing_jobs 
ADD CONSTRAINT ai_processing_jobs_job_type_check 
CHECK (job_type IN ('transcript', 'diagram', 'edit-journey'));

-- Add metadata column for storing additional information like token usage
ALTER TABLE ai_processing_jobs 
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add comment to explain the metadata column
COMMENT ON COLUMN ai_processing_jobs.metadata IS 'Additional metadata like token usage, finish reason, etc.';


-- Create job_status enum
CREATE TYPE job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'partial_success',
  'interrupted'
);

-- Create generation_jobs table
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seed_prompt_id UUID NOT NULL REFERENCES seed_prompts(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL, -- { providers: string[], count_per_provider: number }
  progress JSONB NOT NULL DEFAULT '{"completed": 0, "total": 0}', -- { completed: number, total: number }
  errors JSONB[] DEFAULT ARRAY[]::JSONB[], -- [{ provider: string, message: string, timestamp: string }]
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes
CREATE INDEX idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_seed_id ON generation_jobs(seed_prompt_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_started_at ON generation_jobs(started_at DESC);

-- Enable RLS
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can see all data)
CREATE POLICY "Authenticated users can view all generation jobs"
  ON generation_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert generation jobs"
  ON generation_jobs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all generation jobs"
  ON generation_jobs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add foreign key to generated_variations now that generation_jobs exists
ALTER TABLE generated_variations
  ADD CONSTRAINT fk_generation_job
  FOREIGN KEY (generation_job_id)
  REFERENCES generation_jobs(id)
  ON DELETE SET NULL;

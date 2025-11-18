-- Create generated_variations table
CREATE TABLE generated_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_prompt_id UUID NOT NULL REFERENCES seed_prompts(id) ON DELETE CASCADE,
  generation_job_id UUID DEFAULT NULL, -- Foreign key added later
  prompt_text TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini')),
  model TEXT NOT NULL,
  -- Inherited metadata from seed
  type TEXT NOT NULL,
  goal TEXT NOT NULL,
  attack_vector TEXT NOT NULL,
  obfuscation_level TEXT NOT NULL,
  requires_tool BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes
CREATE INDEX idx_generated_variations_seed_id ON generated_variations(seed_prompt_id);
CREATE INDEX idx_generated_variations_job_id ON generated_variations(generation_job_id);
CREATE INDEX idx_generated_variations_provider ON generated_variations(provider);
CREATE INDEX idx_generated_variations_deleted_at ON generated_variations(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE generated_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can see all data)
CREATE POLICY "Authenticated users can view all variations"
  ON generated_variations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert variations"
  ON generated_variations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update variations"
  ON generated_variations FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete variations"
  ON generated_variations FOR DELETE
  USING (auth.uid() IS NOT NULL);

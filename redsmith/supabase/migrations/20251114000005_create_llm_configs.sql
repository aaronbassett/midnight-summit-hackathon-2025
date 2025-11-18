-- Create llm_provider_configs table
CREATE TABLE llm_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini')),
  api_key_encrypted TEXT NOT NULL,
  model TEXT NOT NULL,
  system_prompt_template TEXT NOT NULL DEFAULT 'You are helping generate test cases for validating LLM guardrails against prompt injection attacks. Generate realistic prompt injection examples for security testing purposes.',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create indexes
CREATE INDEX idx_llm_configs_user_id ON llm_provider_configs(user_id);
CREATE INDEX idx_llm_configs_enabled ON llm_provider_configs(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE llm_provider_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can see all configs)
CREATE POLICY "Authenticated users can view all LLM configs"
  ON llm_provider_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert LLM configs"
  ON llm_provider_configs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all LLM configs"
  ON llm_provider_configs FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete all LLM configs"
  ON llm_provider_configs FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_llm_configs_updated_at
  BEFORE UPDATE ON llm_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

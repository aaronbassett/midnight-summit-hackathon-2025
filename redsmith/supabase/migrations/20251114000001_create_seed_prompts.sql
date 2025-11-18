-- Create seed_prompts table
CREATE TABLE seed_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  description TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wallet_attack', 'benign', 'ambiguous')),
  goal TEXT NOT NULL CHECK (goal IN ('drain_funds', 'approve_spender', 'swap', 'test')),
  attack_vector TEXT NOT NULL CHECK (attack_vector IN ('injection', 'direct_request', 'roleplay', 'multi_turn')),
  obfuscation_level TEXT NOT NULL CHECK (obfuscation_level IN ('none', 'low', 'medium', 'high')),
  requires_tool BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes
CREATE INDEX idx_seed_prompts_user_id ON seed_prompts(user_id);
CREATE INDEX idx_seed_prompts_deleted_at ON seed_prompts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_seed_prompts_type ON seed_prompts(type);
CREATE INDEX idx_seed_prompts_goal ON seed_prompts(goal);
CREATE INDEX idx_seed_prompts_created_at ON seed_prompts(created_at DESC);

-- Enable RLS
ALTER TABLE seed_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can see all data)
CREATE POLICY "Authenticated users can view all seed prompts"
  ON seed_prompts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert seed prompts"
  ON seed_prompts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Authenticated users can update all seed prompts"
  ON seed_prompts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete all seed prompts"
  ON seed_prompts FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seed_prompts_updated_at
  BEFORE UPDATE ON seed_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

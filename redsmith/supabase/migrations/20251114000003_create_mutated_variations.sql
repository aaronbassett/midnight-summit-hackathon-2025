-- Create mutated_variations table
CREATE TABLE mutated_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID NOT NULL REFERENCES generated_variations(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  mutations_applied TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes
CREATE INDEX idx_mutated_variations_variation_id ON mutated_variations(variation_id);
CREATE INDEX idx_mutated_variations_deleted_at ON mutated_variations(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE mutated_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (all authenticated users can see all data)
CREATE POLICY "Authenticated users can view all mutated variations"
  ON mutated_variations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert mutated variations"
  ON mutated_variations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update mutated variations"
  ON mutated_variations FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete mutated variations"
  ON mutated_variations FOR DELETE
  USING (auth.uid() IS NOT NULL);

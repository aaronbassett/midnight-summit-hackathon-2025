# Data Model

**Feature**: Prompt Injection Test Case Generator
**Database**: Supabase PostgreSQL
**Date**: 2025-11-14

## Overview

This data model supports:
- Multi-user isolation via Supabase Auth + RLS
- Hierarchical relationships: Seeds → Variations → Mutations
- Soft deletes with recovery (deleted_at timestamps)
- Real-time sync via Supabase Realtime subscriptions
- Browser-based generation job tracking

## Entity Relationship Diagram

```text
┌─────────────────────┐
│   auth.users        │ (Supabase Auth)
│                     │
│ - id (uuid, pk)     │
│ - email             │
│ - created_at        │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────────────────┐
│   seed_prompts                      │
│                                     │
│ - id (uuid, pk)                     │
│ - user_id (uuid, fk → users)        │
│ - title (text)                      │
│ - description (text)                │
│ - prompt_text (text)                │
│ - type (enum)                       │
│ - goal (enum)                       │
│ - attack_vector (enum)              │
│ - obfuscation_level (enum)          │
│ - requires_tool (boolean)           │
│ - created_at (timestamptz)          │
│ - updated_at (timestamptz)          │
│ - deleted_at (timestamptz, null)    │
└──────────┬──────────────────────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────────────────┐
│   generated_variations              │
│                                     │
│ - id (uuid, pk)                     │
│ - seed_prompt_id (uuid, fk)         │
│ - prompt_text (text)                │
│ - provider (text: openai|anthropic|gemini)
│ - model (text)                      │
│ - type (enum, inherited)            │
│ - goal (enum, inherited)            │
│ - attack_vector (enum, inherited)   │
│ - obfuscation_level (enum, inh.)    │
│ - requires_tool (boolean, inh.)     │
│ - generation_job_id (uuid, fk)      │
│ - created_at (timestamptz)          │
│ - deleted_at (timestamptz, null)    │
└──────────┬──────────────────────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────────────────┐
│   mutated_variations                │
│                                     │
│ - id (uuid, pk)                     │
│ - variation_id (uuid, fk)           │
│ - prompt_text (text)                │
│ - mutations_applied (text[])        │
│ - created_at (timestamptz)          │
│ - deleted_at (timestamptz, null)    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   generation_jobs                   │
│                                     │
│ - id (uuid, pk)                     │
│ - user_id (uuid, fk → users)        │
│ - seed_prompt_id (uuid, fk)         │
│ - status (enum)                     │
│ - config (jsonb)                    │
│ - progress (jsonb)                  │
│ - errors (jsonb[])                  │
│ - started_at (timestamptz)          │
│ - completed_at (timestamptz, null)  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   llm_provider_configs              │
│                                     │
│ - id (uuid, pk)                     │
│ - user_id (uuid, fk → users)        │
│ - provider (text)                   │
│ - api_key_encrypted (text)          │
│ - model (text)                      │
│ - system_prompt_template (text)     │
│ - enabled (boolean)                 │
│ - created_at (timestamptz)          │
│ - updated_at (timestamptz)          │
└─────────────────────────────────────┘
```

---

## Entities

### 1. seed_prompts

Original user-created prompts with metadata.

**Schema**:
```sql
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

-- Indexes
CREATE INDEX idx_seed_prompts_user_id ON seed_prompts(user_id);
CREATE INDEX idx_seed_prompts_deleted_at ON seed_prompts(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_seed_prompts_type ON seed_prompts(type);
CREATE INDEX idx_seed_prompts_goal ON seed_prompts(goal);
CREATE INDEX idx_seed_prompts_created_at ON seed_prompts(created_at DESC);

-- RLS Policies
ALTER TABLE seed_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seed prompts"
  ON seed_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own seed prompts"
  ON seed_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seed prompts"
  ON seed_prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seed prompts"
  ON seed_prompts FOR DELETE
  USING (auth.uid() = user_id);

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
```

**Validation Rules**:
- Title max 200 characters
- All enum fields must match defined values
- Type, goal, attack_vector, obfuscation_level required
- Soft delete via deleted_at (set timestamp instead of DELETE)

**State Transitions**:
- Created → Active (deleted_at = NULL)
- Active → Deleted (set deleted_at = now())
- Deleted → Active (set deleted_at = NULL for recovery)

---

### 2. generated_variations

LLM-generated variations of seed prompts.

**Schema**:
```sql
CREATE TABLE generated_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_prompt_id UUID NOT NULL REFERENCES seed_prompts(id) ON DELETE CASCADE,
  generation_job_id UUID REFERENCES generation_jobs(id) ON DELETE SET NULL,
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

-- Indexes
CREATE INDEX idx_generated_variations_seed_id ON generated_variations(seed_prompt_id);
CREATE INDEX idx_generated_variations_job_id ON generated_variations(generation_job_id);
CREATE INDEX idx_generated_variations_provider ON generated_variations(provider);
CREATE INDEX idx_generated_variations_deleted_at ON generated_variations(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE generated_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variations of their seeds"
  ON generated_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM seed_prompts
      WHERE seed_prompts.id = generated_variations.seed_prompt_id
        AND seed_prompts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variations of their seeds"
  ON generated_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seed_prompts
      WHERE seed_prompts.id = generated_variations.seed_prompt_id
        AND seed_prompts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete variations of their seeds"
  ON generated_variations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM seed_prompts
      WHERE seed_prompts.id = generated_variations.seed_prompt_id
        AND seed_prompts.user_id = auth.uid()
    )
  );
```

**Relationships**:
- Many-to-one with seed_prompts (CASCADE on delete)
- Many-to-one with generation_jobs (SET NULL on delete)

**Inheritance**:
- Metadata (type, goal, attack_vector, obfuscation_level, requires_tool) copied from seed prompt on creation

---

### 3. mutated_variations

Programmatically mutated versions of generated variations.

**Schema**:
```sql
CREATE TABLE mutated_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID NOT NULL REFERENCES generated_variations(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  mutations_applied TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes
CREATE INDEX idx_mutated_variations_variation_id ON mutated_variations(variation_id);
CREATE INDEX idx_mutated_variations_deleted_at ON mutated_variations(deleted_at) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE mutated_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mutations of their variations"
  ON mutated_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM generated_variations gv
      JOIN seed_prompts sp ON sp.id = gv.seed_prompt_id
      WHERE gv.id = mutated_variations.variation_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert mutations of their variations"
  ON mutated_variations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM generated_variations gv
      JOIN seed_prompts sp ON sp.id = gv.seed_prompt_id
      WHERE gv.id = mutated_variations.variation_id
        AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete mutations of their variations"
  ON mutated_variations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM generated_variations gv
      JOIN seed_prompts sp ON sp.id = gv.seed_prompt_id
      WHERE gv.id = mutated_variations.variation_id
        AND sp.user_id = auth.uid()
    )
  );
```

**Relationships**:
- Many-to-one with generated_variations (CASCADE on delete)

**Mutation Tracking**:
- `mutations_applied` is array of mutation type identifiers
- Example: `['character_substitution', 'encoding_base64', 'case_random']`

---

### 4. generation_jobs

Browser-based generation job tracking.

**Schema**:
```sql
CREATE TYPE job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'partial_success',
  'interrupted'
);

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

-- Indexes
CREATE INDEX idx_generation_jobs_user_id ON generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_seed_id ON generation_jobs(seed_prompt_id);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_started_at ON generation_jobs(started_at DESC);

-- RLS Policies
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation jobs"
  ON generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generation jobs"
  ON generation_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation jobs"
  ON generation_jobs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**JSONB Schemas**:

```typescript
// config
interface GenerationJobConfig {
  providers: Array<'openai' | 'anthropic' | 'gemini'>;
  count_per_provider: number;
  system_prompt?: string;
}

// progress
interface GenerationJobProgress {
  completed: number;
  total: number;
}

// errors (array items)
interface GenerationJobError {
  provider: string;
  message: string;
  timestamp: string; // ISO 8601
  error_type?: 'rate_limit' | 'content_policy_refusal' | 'api_error' | 'network_error';
}
```

**State Transitions**:
- pending → running (user starts job)
- running → completed (all variations generated successfully)
- running → failed (unrecoverable error before any completions)
- running → partial_success (some variations completed, some failed)
- running → interrupted (browser closed / network lost)

---

### 5. llm_provider_configs

User-specific LLM provider configurations.

**Schema**:
```sql
CREATE TABLE llm_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini')),
  api_key_encrypted TEXT NOT NULL, -- Encrypted with Supabase Vault
  model TEXT NOT NULL,
  system_prompt_template TEXT NOT NULL DEFAULT 'You are helping generate test cases for validating LLM guardrails against prompt injection attacks. Generate realistic prompt injection examples for security testing purposes.',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX idx_llm_configs_user_id ON llm_provider_configs(user_id);
CREATE INDEX idx_llm_configs_enabled ON llm_provider_configs(enabled) WHERE enabled = true;

-- RLS Policies
ALTER TABLE llm_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own LLM configs"
  ON llm_provider_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_llm_configs_updated_at
  BEFORE UPDATE ON llm_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Security Notes**:
- API keys stored encrypted using Supabase Vault or application-level encryption
- Never expose decrypted API keys to client (decrypt server-side only)
- Consider using Supabase Edge Functions for LLM calls to avoid exposing keys to browser

**Default Models**:
- OpenAI: `gpt-4-turbo-preview`
- Anthropic: `claude-3-5-sonnet-20241022`
- Gemini: `gemini-1.5-flash`

---

## TypeScript Types

Generated from Supabase schema:

```typescript
// types/database.types.ts (auto-generated by Supabase CLI)
export type Database = {
  public: {
    Tables: {
      seed_prompts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          prompt_text: string;
          type: 'wallet_attack' | 'benign' | 'ambiguous';
          goal: 'drain_funds' | 'approve_spender' | 'swap' | 'test';
          attack_vector: 'injection' | 'direct_request' | 'roleplay' | 'multi_turn';
          obfuscation_level: 'none' | 'low' | 'medium' | 'high';
          requires_tool: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Insert>;
      };
      // ... other tables
    };
  };
};

// Application domain types
export interface SeedPrompt {
  id: string;
  userId: string;
  title: string;
  description: string;
  promptText: string;
  type: PromptType;
  goal: PromptGoal;
  attackVector: AttackVector;
  obfuscationLevel: ObfuscationLevel;
  requiresTool: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type PromptType = 'wallet_attack' | 'benign' | 'ambiguous';
export type PromptGoal = 'drain_funds' | 'approve_spender' | 'swap' | 'test';
export type AttackVector = 'injection' | 'direct_request' | 'roleplay' | 'multi_turn';
export type ObfuscationLevel = 'none' | 'low' | 'medium' | 'high';
export type LLMProvider = 'openai' | 'anthropic' | 'gemini';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial_success' | 'interrupted';
```

---

## Queries

### Common Queries

**Get all active seeds for user (not deleted)**:
```typescript
const { data, error } = await supabase
  .from('seed_prompts')
  .select('*')
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

**Get seed with all variations and mutations**:
```typescript
const { data, error } = await supabase
  .from('seed_prompts')
  .select(`
    *,
    generated_variations (
      *,
      mutated_variations (*)
    )
  `)
  .eq('id', seedId)
  .single();
```

**Get dashboard statistics**:
```typescript
// Total seeds (not deleted)
const { count: seedCount } = await supabase
  .from('seed_prompts')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null);

// Total variations (not deleted, seeds not deleted)
const { count: variationCount } = await supabase
  .from('generated_variations')
  .select('seed_prompts!inner(*)', { count: 'exact', head: true })
  .is('deleted_at', null)
  .is('seed_prompts.deleted_at', null);

// Active jobs
const { data: activeJobs } = await supabase
  .from('generation_jobs')
  .select('*')
  .in('status', ['pending', 'running'])
  .order('started_at', { ascending: false });
```

**Search prompts by text**:
```typescript
const { data, error } = await supabase
  .from('seed_prompts')
  .select('*')
  .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,prompt_text.ilike.%${searchTerm}%`)
  .is('deleted_at', null);
```

**Filter by metadata**:
```typescript
const { data, error } = await supabase
  .from('seed_prompts')
  .select('*')
  .eq('type', 'wallet_attack')
  .eq('goal', 'drain_funds')
  .is('deleted_at', null);
```

---

## Migration Strategy

**Step 1**: Create migrations in `supabase/migrations/`

```sql
-- 20251114000001_create_seed_prompts.sql
CREATE TABLE seed_prompts (...);

-- 20251114000002_create_generated_variations.sql
CREATE TABLE generated_variations (...);

-- 20251114000003_create_mutated_variations.sql
CREATE TABLE mutated_variations (...);

-- 20251114000004_create_generation_jobs.sql
CREATE TABLE generation_jobs (...);

-- 20251114000005_create_llm_configs.sql
CREATE TABLE llm_provider_configs (...);
```

**Step 2**: Run migrations

```bash
supabase db push
```

**Step 3**: Generate TypeScript types

```bash
supabase gen types typescript --local > types/database.types.ts
```

---

## Realtime Subscriptions

**Subscribe to generation job updates**:
```typescript
const channel = supabase
  .channel('generation_jobs_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'generation_jobs',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      console.log('Job updated:', payload);
      // Update UI state
    }
  )
  .subscribe();
```

**Subscribe to new variations (for dashboard)**:
```typescript
const channel = supabase
  .channel('variations_changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'generated_variations',
    },
    async (payload) => {
      // Check if this variation belongs to current user
      const { data: seed } = await supabase
        .from('seed_prompts')
        .select('user_id')
        .eq('id', payload.new.seed_prompt_id)
        .single();

      if (seed?.user_id === userId) {
        // Update dashboard counts
      }
    }
  )
  .subscribe();
```

---

## Data Volume Estimates

For 100 seed prompts × 30 variations each × 2 mutations per variation:

- **seed_prompts**: 100 rows
- **generated_variations**: 3,000 rows
- **mutated_variations**: 6,000 rows
- **generation_jobs**: ~100 rows (1 per seed)
- **llm_provider_configs**: 3 rows (one per provider)

**Total**: ~9,200 rows per user for moderate usage.

Storage: ~50MB per user (assuming average 500 chars per prompt).

Supabase free tier: 500MB database, sufficient for 10 users at this scale.

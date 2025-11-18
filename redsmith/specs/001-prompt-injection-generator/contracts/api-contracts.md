# API Contracts

**Feature**: Prompt Injection Test Case Generator
**Architecture**: Vite + React + Supabase (Client SDK + Edge Functions)
**Date**: 2025-11-14
**Last Updated**: 2025-11-14 (Updated to reflect actual Vite implementation)

## Overview

This application uses **Supabase Client SDK** for data access, not traditional REST endpoints. All database operations are performed client-side with server-side enforcement via Row Level Security (RLS) policies.

**Pattern**: Client → Supabase Client SDK → PostgreSQL (with RLS)

However, for LLM generation operations (which require API key security), we use **Supabase Edge Functions** to keep API keys server-side and secure.

**IMPORTANT**: This project is implemented using **Vite + React**, not Next.js. Therefore:
- No Next.js Server Actions (use Edge Functions instead)
- No middleware (use client-side auth checks in App.tsx)
- Client-side routing (useState-based navigation)
- Zustand for state management instead of React Context

---

## Authentication

### Login

**Pattern**: Supabase Auth (Email/Password)

```typescript
// src/stores/authStore.ts (Zustand)
import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    set({ user: data.user, session: data.session });
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, session: null });
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, loading: false });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null });
    });

    return () => subscription.unsubscribe();
  },
}));
```

**Client-Side Route Protection**:
```typescript
// src/App.tsx
function App() {
  const { user, loading, initialize } = useAuthStore();
  const [navigation, setNavigation] = useState<NavigationState>({ page: 'login' });

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Render authenticated pages based on navigation state
  return (
    <div className="flex h-screen">
      <Sidebar currentPage={navigation.page} onNavigate={(page) => setNavigation({ page })} />
      <main className="flex-1">
        {navigation.page === 'dashboard' && <Dashboard />}
        {navigation.page === 'prompts' && <PromptList />}
        {/* ... other pages */}
      </main>
    </div>
  );
}
```

---

## Seed Prompts

### Create Seed Prompt

**Method**: Supabase Client Insert

```typescript
// lib/api/seed-prompts.ts
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type SeedPromptInsert = Database['public']['Tables']['seed_prompts']['Insert'];

export async function createSeedPrompt(data: Omit<SeedPromptInsert, 'user_id'>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: seed, error } = await supabase
    .from('seed_prompts')
    .insert({
      ...data,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return seed;
}
```

**Validation Schema** (zod):
```typescript
// lib/validation/seed-prompt.ts
import { z } from 'zod';

export const createSeedPromptSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().min(1, 'Description required'),
  prompt_text: z.string().min(1, 'Prompt text required'),
  type: z.enum(['wallet_attack', 'benign', 'ambiguous']),
  goal: z.enum(['drain_funds', 'approve_spender', 'swap', 'test']),
  attack_vector: z.enum(['injection', 'direct_request', 'roleplay', 'multi_turn']),
  obfuscation_level: z.enum(['none', 'low', 'medium', 'high']),
  requires_tool: z.boolean(),
});

export type CreateSeedPromptInput = z.infer<typeof createSeedPromptSchema>;
```

---

### List Seed Prompts

**Method**: Supabase Client Select

```typescript
export interface ListSeedPromptsFilters {
  type?: string;
  goal?: string;
  attack_vector?: string;
  obfuscation_level?: string;
  search?: string;
  includeDeleted?: boolean;
}

export async function listSeedPrompts(filters: ListSeedPromptsFilters = {}) {
  let query = supabase
    .from('seed_prompts')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (!filters.includeDeleted) {
    query = query.is('deleted_at', null);
  }

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.goal) {
    query = query.eq('goal', filters.goal);
  }

  if (filters.attack_vector) {
    query = query.eq('attack_vector', filters.attack_vector);
  }

  if (filters.obfuscation_level) {
    query = query.eq('obfuscation_level', filters.obfuscation_level);
  }

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,prompt_text.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}
```

---

### Get Seed Prompt with Variations

**Method**: Supabase Client Select (with joins)

```typescript
export async function getSeedPromptWithVariations(seedId: string) {
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
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data;
}
```

---

### Update Seed Prompt

**Method**: Supabase Client Update

```typescript
export async function updateSeedPrompt(
  seedId: string,
  updates: Partial<CreateSeedPromptInput>
) {
  const { data, error } = await supabase
    .from('seed_prompts')
    .update(updates)
    .eq('id', seedId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

### Soft Delete Seed Prompt

**Method**: Supabase Client Update

```typescript
export async function deleteSeedPrompt(seedId: string) {
  const { data, error } = await supabase
    .from('seed_prompts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', seedId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

### Recover Deleted Seed Prompt

**Method**: Supabase Client Update

```typescript
export async function recoverSeedPrompt(seedId: string) {
  const { data, error } = await supabase
    .from('seed_prompts')
    .update({ deleted_at: null })
    .eq('id', seedId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## Generation Jobs

### Start Generation Job (Supabase Edge Function)

**Method**: Supabase Edge Function (to protect API keys)

**IMPORTANT**: Edge Functions run on Supabase's Deno runtime, not Node.js.

**Request Body**:
```typescript
interface GenerateVariationRequest {
  seedPromptId: string;
  provider: 'openai' | 'anthropic' | 'gemini';
  model?: string;
  systemPrompt?: string;
}
```

**Edge Function Implementation**:
```typescript
// supabase/functions/generate-variation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')!;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  // Verify authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { seedPromptId, provider, model, systemPrompt } = await req.json();

  // Get seed prompt
  const { data: seed } = await supabase
    .from('seed_prompts')
    .select('*')
    .eq('id', seedPromptId)
    .single();

  if (!seed) {
    return new Response(JSON.stringify({ error: 'Seed prompt not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get API key from Supabase secrets/environment
  const apiKey = Deno.env.get(`${provider.toUpperCase()}_API_KEY`);
  if (!apiKey) {
    return new Response(JSON.stringify({ error: `${provider} API key not configured` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Call LLM provider
    let generatedText: string;

    switch (provider) {
      case 'openai':
        generatedText = await callOpenAI(seed.content, systemPrompt, apiKey, model);
        break;
      case 'anthropic':
        generatedText = await callAnthropic(seed.content, systemPrompt, apiKey, model);
        break;
      case 'gemini':
        generatedText = await callGemini(seed.content, systemPrompt, apiKey, model);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    // Save variation to database
    const { data: variation, error: saveError } = await supabase
      .from('generated_variations')
      .insert({
        seed_prompt_id: seedPromptId,
        user_id: user.id,
        provider,
        model: model || getDefaultModel(provider),
        generated_text: generatedText,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ variation }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: {
        type: error.status === 429 ? 'rate_limit' :
              error.message?.includes('content_policy') ? 'content_policy_refusal' :
              'api_error',
        message: error.message || 'Unknown error',
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Client-Side Usage**:
```typescript
// src/lib/llm/generator.ts
import { supabase } from '../supabase/client';

export async function generateVariation(
  seedPromptId: string,
  provider: 'openai' | 'anthropic' | 'gemini',
  options?: { model?: string; systemPrompt?: string }
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-variation`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        seedPromptId,
        provider,
        model: options?.model,
        systemPrompt: options?.systemPrompt,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Generation failed');
  }

  const { variation } = await response.json();
  return variation;
}
```

---

### Client-Side Job Orchestration

**Method**: Client-side orchestration with retry logic and Realtime updates

```typescript
// src/stores/generationStore.ts (Zustand)
import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import { generateVariation } from '../lib/llm/generator';
import { retryWithExponentialBackoff } from '../lib/utils/retry';

export const useGenerationStore = create<GenerationState>((set, get) => ({
  jobs: [],
  currentJob: null,

  async startGenerationJob(
    seedPromptId: string,
    providers: Array<'openai' | 'anthropic' | 'gemini'>,
    countPerProvider: number
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create job in database
    const totalVariations = providers.length * countPerProvider;
    const { data: job, error } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: user.id,
        seed_prompt_id: seedPromptId,
        status: 'running',
        config: { providers, count_per_provider: countPerProvider },
        progress: { completed: 0, total: totalVariations },
      })
      .select()
      .single();

    if (error) throw error;

    set({ currentJob: job });

    // Execute generation loop
    await get().executeGenerationJob(job.id, seedPromptId, providers, countPerProvider);
  },

  async executeGenerationJob(
    jobId: string,
    seedPromptId: string,
    providers: Array<'openai' | 'anthropic' | 'gemini'>,
    countPerProvider: number
  ) {
    let completed = 0;
    const total = providers.length * countPerProvider;

    for (const provider of providers) {
      for (let i = 0; i < countPerProvider; i++) {
        try {
          // Call Edge Function with retry logic
          await retryWithExponentialBackoff(
            () => generateVariation(seedPromptId, provider),
            { maxAttempts: 5, baseDelay: 1000 }
          );

          completed++;

          // Update progress in database
          await supabase
            .from('generation_jobs')
            .update({
              progress: { completed, total },
              status: completed === total ? 'completed' : 'running',
            })
            .eq('id', jobId);

        } catch (error: any) {
          console.error(`Failed to generate variation: ${error.message}`);
          // Continue with next variation
        }
      }
    }

    // Mark job as completed
    await supabase
      .from('generation_jobs')
      .update({ status: 'completed' })
      .eq('id', jobId);

    set({ currentJob: null });
  },
}));
```

---

## Mutations

### Apply Mutations

**Method**: Supabase Client Insert (after client-side mutation processing)

```typescript
// lib/api/mutations.ts
import { applyMutations, type MutationType } from '@/lib/mutations/engine';
import { supabase } from '@/lib/supabase/client';

export async function createMutatedVariations(
  variationIds: string[],
  mutations: MutationType[]
) {
  const results = [];

  for (const variationId of variationIds) {
    // Get original variation
    const { data: variation } = await supabase
      .from('generated_variations')
      .select('*')
      .eq('id', variationId)
      .single();

    if (!variation) continue;

    // Apply mutations (client-side processing)
    const { mutated, applied } = await applyMutations(
      variation.prompt_text,
      mutations
    );

    // Save mutated variation
    const { data: mutatedVariation, error } = await supabase
      .from('mutated_variations')
      .insert({
        variation_id: variationId,
        prompt_text: mutated,
        mutations_applied: applied,
      })
      .select()
      .single();

    if (!error) {
      results.push(mutatedVariation);
    }
  }

  return results;
}
```

---

## Dashboard Statistics

### Get Dashboard Stats

**Method**: Supabase Client Aggregation

```typescript
// lib/api/dashboard.ts
export interface DashboardStats {
  totalSeeds: number;
  totalVariations: number;
  totalMutations: number;
  totalPrompts: number;
  promptsByType: Record<string, number>;
  recentSeeds: any[];
  activeJobs: any[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Total seeds (not deleted)
  const { count: totalSeeds } = await supabase
    .from('seed_prompts')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  // Total variations (not deleted, seed not deleted)
  const { count: totalVariations } = await supabase
    .from('generated_variations')
    .select('seed_prompts!inner(*)', { count: 'exact', head: true })
    .is('deleted_at', null)
    .is('seed_prompts.deleted_at', null);

  // Total mutations (not deleted)
  const { count: totalMutations } = await supabase
    .from('mutated_variations')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  // Recent seeds
  const { data: recentSeeds } = await supabase
    .from('seed_prompts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // Active jobs
  const { data: activeJobs } = await supabase
    .from('generation_jobs')
    .select('*, seed_prompts(*)')
    .in('status', ['pending', 'running'])
    .order('started_at', { ascending: false });

  // Prompts by type
  const { data: seedsByType } = await supabase
    .from('seed_prompts')
    .select('type')
    .is('deleted_at', null);

  const promptsByType = (seedsByType || []).reduce((acc, seed) => {
    acc[seed.type] = (acc[seed.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalSeeds: totalSeeds || 0,
    totalVariations: totalVariations || 0,
    totalMutations: totalMutations || 0,
    totalPrompts: (totalSeeds || 0) + (totalVariations || 0) + (totalMutations || 0),
    promptsByType,
    recentSeeds: recentSeeds || [],
    activeJobs: activeJobs || [],
  };
}
```

---

## Environment Variables

**.env.example**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LLM API Keys (server-side only, never expose to client)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

---

## Error Handling

All functions should follow this pattern:

```typescript
try {
  const result = await someOperation();
  return { data: result, error: null };
} catch (error: any) {
  console.error('Operation failed:', error);
  return { data: null, error: error.message || 'Unknown error' };
}
```

**Error Types**:
- `AuthenticationError`: User not authenticated
- `AuthorizationError`: User lacks permission (RLS rejection)
- `ValidationError`: Input validation failed
- `NetworkError`: Network connectivity issue
- `RateLimitError`: LLM provider rate limit hit
- `ContentPolicyError`: LLM provider content policy refusal
- `DatabaseError`: Supabase/PostgreSQL error

---

## Realtime Subscriptions

Documented in data-model.md. Key patterns:

```typescript
// Subscribe to job updates
const channel = supabase
  .channel('job_updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'generation_jobs',
    filter: `id=eq.${jobId}`,
  }, (payload) => {
    // Update UI with new job status
  })
  .subscribe();
```

---

## Summary

- **Authentication**: Supabase Auth (Magic Link)
- **Data Access**: Supabase Client SDK with RLS
- **Generation**: Next.js Server Actions (to protect API keys)
- **Mutations**: Client-side processing
- **Realtime**: Supabase Realtime subscriptions
- **Error Handling**: Exponential backoff for rate limits, structured error responses

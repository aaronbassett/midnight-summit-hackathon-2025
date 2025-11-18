# Research & Technical Decisions

**Feature**: Prompt Injection Test Case Generator
**Date**: 2025-11-14
**Purpose**: Resolve NEEDS CLARIFICATION items from Technical Context and document best practices

## Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State Management | React Context + hooks | Simple, built-in, sufficient for UI state; avoid over-engineering |
| Form Handling | React Hook Form | Type-safe, minimal re-renders, good DX, integrates with shadcn/ui |
| Testing Strategy | Manual testing (optional Vitest) | Per constitution - ship fast, add tests only if helpful for complex logic |

---

## 1. State Management

### Decision: React Context + Custom Hooks

**Rationale**:
- **Simplicity**: Built into React, no additional dependencies for basic state
- **Sufficient Scope**: Auth state (Supabase), UI state (modals, filters), generation job state
- **Constitution Alignment**: "Good Enough Architecture" - avoid unnecessary complexity
- **Supabase Integration**: Supabase Realtime handles server state sync automatically

**Alternatives Considered**:
- **Zustand**: Lightweight, good DX, but adds dependency for state that React Context handles well
- **Jotai**: Atomic state, minimal boilerplate, but unnecessary for this scope
- **Redux Toolkit**: Overkill for this application size

**Implementation Pattern**:
```typescript
// contexts/GenerationContext.tsx
interface GenerationJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
  progress: { completed: number; total: number };
  errors: Array<{ provider: string; message: string }>;
}

const GenerationContext = createContext<{
  jobs: GenerationJob[];
  startJob: (seedId: string, config: GenerationConfig) => Promise<void>;
  cancelJob: (jobId: string) => void;
}>(null);
```

**Best Practices**:
- Use separate contexts for separate concerns (Auth, Generation, UI)
- Keep context values stable with useMemo/useCallback
- Lift state only as high as needed
- Use Supabase Realtime subscriptions for cross-device state sync

---

## 2. Form Handling

### Decision: React Hook Form

**Rationale**:
- **Performance**: Uncontrolled components minimize re-renders
- **Type Safety**: Excellent TypeScript support with zod schema validation
- **DX**: Simple API, good error handling, integrates with shadcn/ui
- **Validation**: Built-in validation + zod for complex rules
- **Bundle Size**: ~9KB gzipped, reasonable for the value

**Alternatives Considered**:
- **Formik**: More verbose API, heavier bundle, slower performance
- **Plain React State**: Requires manual validation, error handling, more boilerplate
- **TanStack Form**: Good but newer, less ecosystem support

**Implementation Pattern**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const seedPromptSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().min(1, 'Description required'),
  prompt_text: z.string().min(1, 'Prompt text required'),
  type: z.enum(['wallet_attack', 'benign', 'ambiguous']),
  goal: z.enum(['drain_funds', 'approve_spender', 'swap', 'test']),
  attack_vector: z.enum(['injection', 'direct_request', 'roleplay', 'multi_turn']),
  obfuscation_level: z.enum(['none', 'low', 'medium', 'high']),
  requires_tool: z.boolean(),
});

type SeedPromptForm = z.infer<typeof seedPromptSchema>;

function SeedPromptForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<SeedPromptForm>({
    resolver: zodResolver(seedPromptSchema),
  });

  const onSubmit = async (data: SeedPromptForm) => {
    await supabase.from('seed_prompts').insert(data);
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

**Best Practices**:
- Use zod for schema validation (reuse schemas for API validation)
- Leverage shadcn/ui form components with Controller for custom inputs
- Keep validation logic in schemas, not components
- Use mode: 'onBlur' for better UX (validate after user leaves field)

---

## 3. Testing Strategy

### Decision: Manual Testing (Vitest + React Testing Library optional)

**Rationale**:
- **Constitution Alignment**: "Tests Are Optional, Not Forbidden" - ship fast, test if helpful
- **MVP Focus**: Manual testing of happy path sufficient for hackathon demo
- **Complexity Trade-off**: Automated tests add value for retry logic, mutation engine, exponential backoff
- **Pragmatic Approach**: Add tests where they save debugging time, skip elsewhere

**When to Add Tests**:
1. **Exponential Backoff Logic** (`lib/utils/retry.ts`) - Easy to test, prevents subtle bugs
2. **Mutation Engine** (`lib/mutations/engine.ts`) - Complex transformations benefit from examples
3. **Form Validation** - If zod schemas get complex, test edge cases

**When to Skip Tests**:
1. **UI Components** - Manual testing faster than snapshot/interaction tests
2. **Database Queries** - Supabase provides type safety, manual testing sufficient
3. **Simple CRUD** - Over-testing slows development for low-value validation

**Optional Test Setup** (if needed):
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});

// Example test: lib/utils/retry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { retryWithExponentialBackoff } from './retry';

describe('retryWithExponentialBackoff', () => {
  it('retries with increasing delays', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Rate limit');
      return 'success';
    });

    const result = await retryWithExponentialBackoff(fn, { maxAttempts: 5 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
```

**Best Practices**:
- Test complex logic, not simple mappings
- Integration tests > unit tests (per constitution)
- Manual end-to-end testing for UI flows
- Use TypeScript for compile-time validation instead of runtime tests where possible

---

## 4. LLM Integration Patterns

### Research: OpenAI, Anthropic, Gemini Best Practices

**OpenAI SDK**:
```typescript
// lib/llm/openai.ts
import OpenAI from 'openai';

export async function generateVariation(
  seedPrompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: seedPrompt },
    ],
    temperature: 0.8, // Higher for diverse variations
    max_tokens: 500,
  });

  return response.choices[0].message.content || '';
}
```

**Anthropic SDK**:
```typescript
// lib/llm/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';

export async function generateVariation(
  seedPrompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: seedPrompt }],
    temperature: 0.8,
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
```

**Gemini SDK**:
```typescript
// lib/llm/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateVariation(
  seedPrompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(seedPrompt);
  return result.response.text();
}
```

**Unified Generator Pattern**:
```typescript
// lib/llm/generator.ts
type LLMProvider = 'openai' | 'anthropic' | 'gemini';

interface GenerationConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  systemPrompt: string;
}

export async function generateVariation(
  seedPrompt: string,
  config: GenerationConfig
): Promise<string> {
  switch (config.provider) {
    case 'openai':
      return openai.generateVariation(seedPrompt, config.systemPrompt, config.apiKey);
    case 'anthropic':
      return anthropic.generateVariation(seedPrompt, config.systemPrompt, config.apiKey);
    case 'gemini':
      return gemini.generateVariation(seedPrompt, config.systemPrompt, config.apiKey);
  }
}
```

**Rate Limit Handling**:
- OpenAI: 429 status code, check `retry-after` header
- Anthropic: 429 status code, `retry-after` header
- Gemini: 429 status code, `Retry-After` header

All three support exponential backoff with similar patterns.

---

## 5. Supabase Integration Patterns

### Research: Auth, Realtime, RLS Best Practices

**Authentication Setup**:
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// middleware.ts - Protect auth routes
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(/* ... */);
  await supabase.auth.getSession();
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/prompts/:path*'],
};
```

**Row Level Security (RLS)**:
```sql
-- Enable RLS on all tables
ALTER TABLE seed_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutated_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can CRUD their own seed_prompts"
  ON seed_prompts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own generated_variations"
  ON generated_variations
  FOR ALL
  USING (
    auth.uid() = (
      SELECT user_id FROM seed_prompts WHERE id = generated_variations.seed_prompt_id
    )
  );
```

**Realtime Subscriptions**:
```typescript
// Subscribe to generation job updates
useEffect(() => {
  const channel = supabase
    .channel('generation_jobs')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'generation_jobs',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        // Update local state with new job status
        updateJobState(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user.id]);
```

**Offline Queue Pattern**:
```typescript
// lib/supabase/offline-queue.ts
interface QueuedMutation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export class OfflineQueue {
  private queue: QueuedMutation[] = [];

  async add(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
    const queued: QueuedMutation = {
      ...mutation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.queue.push(queued);
    localStorage.setItem('offline-queue', JSON.stringify(this.queue));

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.sync();
    }
  }

  async sync() {
    const pending = [...this.queue];

    for (const mutation of pending) {
      try {
        await this.executeMutation(mutation);
        this.queue = this.queue.filter(m => m.id !== mutation.id);
      } catch (err) {
        console.error('Sync failed:', mutation, err);
        // Keep in queue for retry
      }
    }

    localStorage.setItem('offline-queue', JSON.stringify(this.queue));
  }

  private async executeMutation(mutation: QueuedMutation) {
    const { table, operation, data } = mutation;

    switch (operation) {
      case 'insert':
        await supabase.from(table).insert(data);
        break;
      case 'update':
        await supabase.from(table).update(data).eq('id', data.id);
        break;
      case 'delete':
        await supabase.from(table).delete().eq('id', data.id);
        break;
    }
  }
}
```

---

## 6. Exponential Backoff Implementation

### Research: Retry Strategies for Rate Limits

**Exponential Backoff with Jitter**:
```typescript
// lib/utils/retry.ts
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number;
  jitter?: boolean;
}

export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 5,
    baseDelay = 1000,
    maxDelay = 16000,
    jitter = true,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if not a rate limit error
      if (error.status !== 429 && !error.message?.includes('rate limit')) {
        throw error;
      }

      // Last attempt - don't wait
      if (attempt === maxAttempts - 1) {
        throw error;
      }

      // Calculate delay: 2^attempt * baseDelay
      let delay = Math.min(Math.pow(2, attempt) * baseDelay, maxDelay);

      // Add jitter (random ±25%)
      if (jitter) {
        const jitterRange = delay * 0.25;
        delay = delay + (Math.random() * 2 - 1) * jitterRange;
      }

      console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage in generation
export async function generateWithRetry(
  seedPrompt: string,
  config: GenerationConfig
): Promise<string> {
  return retryWithExponentialBackoff(
    () => generateVariation(seedPrompt, config),
    {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 16000,
    }
  );
}
```

**Best Practices**:
- Add jitter to prevent thundering herd
- Respect `Retry-After` header if present
- Log retry attempts for debugging
- Use different base delays per provider if needed
- Don't retry on non-rate-limit errors (400, 401, etc.)

---

## 7. Mutation Engine Design

### Research: Prompt Obfuscation Techniques

**Character Substitution**:
```typescript
// lib/mutations/character-substitution.ts
const leetSpeakMap: Record<string, string> = {
  'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7',
  'A': '4', 'E': '3', 'I': '1', 'O': '0', 'S': '5', 'T': '7',
};

const homoglyphMap: Record<string, string> = {
  'a': 'а', // Cyrillic а
  'e': 'е', // Cyrillic е
  'o': 'о', // Cyrillic о
  // ... more homoglyphs
};

export function applyCharacterSubstitution(
  text: string,
  intensity: 'low' | 'medium' | 'high'
): string {
  const percentage = intensity === 'low' ? 0.2 : intensity === 'medium' ? 0.5 : 0.8;

  return text.split('').map(char => {
    if (Math.random() < percentage && leetSpeakMap[char]) {
      return leetSpeakMap[char];
    }
    return char;
  }).join('');
}
```

**Encoding Transformations**:
```typescript
// lib/mutations/encoding.ts
export function applyBase64Encoding(text: string, partial: boolean = false): string {
  if (partial) {
    // Encode only parts of the text
    const words = text.split(' ');
    const encodedWords = words.map((word, idx) =>
      idx % 2 === 0 ? btoa(word) : word
    );
    return encodedWords.join(' ');
  }
  return btoa(text);
}

export function applyHexEncoding(text: string): string {
  return Array.from(text)
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
}

export function applyUnicodeEscaping(text: string): string {
  return Array.from(text)
    .map(char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
    .join('');
}
```

**Case Manipulation**:
```typescript
// lib/mutations/case.ts
export function applyRandomCase(text: string): string {
  return text.split('').map(char =>
    Math.random() < 0.5 ? char.toLowerCase() : char.toUpperCase()
  ).join('');
}

export function applyAlternatingCase(text: string): string {
  return text.split('').map((char, idx) =>
    idx % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
  ).join('');
}
```

**Whitespace Injection**:
```typescript
// lib/mutations/whitespace.ts
export function injectWhitespace(text: string, intensity: 'low' | 'medium' | 'high'): string {
  const spaces = intensity === 'low' ? 1 : intensity === 'medium' ? 3 : 5;

  return text.split('').map((char, idx) => {
    if (idx > 0 && Math.random() < 0.3) {
      return ' '.repeat(spaces) + char;
    }
    return char;
  }).join('');
}

export function injectZeroWidthChars(text: string): string {
  const zeroWidth = '\u200B'; // Zero-width space
  return text.split('').join(zeroWidth);
}
```

**Mutation Orchestration**:
```typescript
// lib/mutations/engine.ts
export type MutationType =
  | 'character_substitution'
  | 'encoding_base64'
  | 'encoding_hex'
  | 'case_random'
  | 'case_alternating'
  | 'whitespace_injection';

export async function applyMutations(
  text: string,
  mutations: MutationType[]
): Promise<{ mutated: string; applied: MutationType[] }> {
  let mutated = text;
  const applied: MutationType[] = [];

  for (const mutation of mutations) {
    try {
      mutated = applyMutation(mutated, mutation);
      applied.push(mutation);
    } catch (err) {
      console.error(`Failed to apply mutation ${mutation}:`, err);
    }
  }

  return { mutated, applied };
}

function applyMutation(text: string, mutation: MutationType): string {
  switch (mutation) {
    case 'character_substitution':
      return applyCharacterSubstitution(text, 'medium');
    case 'encoding_base64':
      return applyBase64Encoding(text, true);
    case 'encoding_hex':
      return applyHexEncoding(text);
    case 'case_random':
      return applyRandomCase(text);
    case 'case_alternating':
      return applyAlternatingCase(text);
    case 'whitespace_injection':
      return injectWhitespace(text, 'medium');
    default:
      return text;
  }
}
```

---

## Summary

All NEEDS CLARIFICATION items resolved:

1. **State Management**: React Context + hooks (simple, sufficient)
2. **Forms**: React Hook Form + zod (type-safe, performant)
3. **Testing**: Manual testing, optional Vitest for complex logic

Additional research completed:
- LLM integration patterns for OpenAI, Anthropic, Gemini
- Supabase Auth, RLS, Realtime best practices
- Exponential backoff with jitter implementation
- Mutation engine design with multiple obfuscation techniques

**Ready for Phase 1**: Data model design and API contracts.

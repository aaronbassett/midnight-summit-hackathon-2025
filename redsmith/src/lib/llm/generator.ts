/**
 * Client-side LLM generation orchestrator
 * Calls Supabase Edge Function to generate variations
 */

import { supabase } from '../supabase/client';
import type { LLMProvider, GenerationResult, GenerationError } from './types';

/**
 * Generate a single variation using the Edge Function
 */
export async function generateVariation(
  seedPromptId: string,
  provider: LLMProvider,
  options?: { model?: string; systemPrompt?: string }
): Promise<GenerationResult['variation']> {
  // Get current session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  // Get Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured');
  }

  // Fetch the seed prompt to determine its type
  const { data: seedPrompt, error: seedError } = await supabase
    .from('seed_prompts')
    .select('type')
    .eq('id', seedPromptId)
    .is('deleted_at', null)
    .single();

  if (seedError || !seedPrompt) {
    throw new Error('Seed prompt not found');
  }

  // Determine which edge function to call based on prompt type
  const edgeFunction =
    seedPrompt.type === 'benign' ? 'generate-benign-variation' : 'generate-variation';

  // Call Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/${edgeFunction}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      seedPromptId,
      provider,
      model: options?.model,
      systemPrompt: options?.systemPrompt,
    }),
  });

  if (!response.ok) {
    const error: GenerationError = await response.json();
    throw new Error(error.error?.message || 'Generation failed');
  }

  const result: GenerationResult = await response.json();
  return result.variation;
}

/**
 * Generate multiple variations in sequence
 */
export async function generateVariations(
  seedPromptId: string,
  configs: Array<{ provider: LLMProvider; model?: string; count: number }>,
  options?: {
    systemPrompt?: string;
    onProgress?: (progress: { completed: number; total: number }) => void;
    onError?: (error: Error, provider: LLMProvider) => void;
  }
): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ provider: LLMProvider; error: Error }>;
}> {
  const total = configs.reduce((sum, config) => sum + config.count, 0);
  let completed = 0;
  const errors: Array<{ provider: LLMProvider; error: Error }> = [];

  for (const config of configs) {
    for (let i = 0; i < config.count; i++) {
      try {
        await generateVariation(seedPromptId, config.provider, {
          model: config.model,
          systemPrompt: options?.systemPrompt,
        });

        completed++;
        options?.onProgress?.({ completed, total });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Failed to generate variation with ${config.provider}:`, err);
        errors.push({ provider: config.provider, error: err });
        options?.onError?.(err, config.provider);
      }
    }
  }

  return {
    succeeded: completed,
    failed: errors.length,
    errors,
  };
}

/**
 * Estimate generation time based on provider and count
 */
export function estimateGenerationTime(
  configs: Array<{ provider: LLMProvider; count: number }>
): number {
  // Average time per generation (in milliseconds)
  const avgTimings: Record<LLMProvider, number> = {
    openai: 3000,
    anthropic: 2500,
    gemini: 2000,
  };

  let totalTime = 0;
  for (const config of configs) {
    totalTime += avgTimings[config.provider] * config.count;
  }

  return totalTime;
}

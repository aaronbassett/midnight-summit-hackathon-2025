import { supabase } from '../supabase/client';
import type { LLMProvider } from './types';

export interface ValidationResult {
  success: boolean;
  models?: string[];
  error?: string;
  provider: LLMProvider;
}

/**
 * Validates an API key by calling the validate-api-key Edge Function
 * which fetches available models from the provider's API
 */
export async function validateApiKey(provider: LLMProvider): Promise<ValidationResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: 'Not authenticated',
        provider,
      };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-api-key`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Validation failed',
        provider,
      };
    }

    const result = await response.json();

    return {
      success: result.success,
      models: result.models,
      error: result.error,
      provider,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred',
      provider,
    };
  }
}

/**
 * Validates all enabled providers
 */
export async function validateAllProviders(
  enabledProviders: LLMProvider[]
): Promise<Record<LLMProvider, ValidationResult>> {
  const results = await Promise.all(enabledProviders.map((provider) => validateApiKey(provider)));

  const resultMap: Record<string, ValidationResult> = {};
  results.forEach((result) => {
    resultMap[result.provider] = result;
  });

  return resultMap as Record<LLMProvider, ValidationResult>;
}

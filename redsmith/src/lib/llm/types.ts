/**
 * LLM provider types and interfaces
 */

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface GenerationConfig {
  provider: LLMProvider;
  model?: string;
  systemPrompt?: string;
}

export interface GenerationRequest {
  seedPromptId: string;
  provider: LLMProvider;
  model?: string;
  systemPrompt?: string;
}

export interface GenerationResult {
  variation: {
    id: string;
    seed_prompt_id: string;
    user_id: string;
    provider: string;
    model: string;
    generated_text: string;
    metadata: {
      system_prompt: string | null;
      generated_at: string;
    };
    created_at: string;
  };
}

export interface GenerationError {
  error: {
    type: 'rate_limit' | 'content_policy_refusal' | 'api_error' | 'network_error';
    message: string;
  };
}

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  openai: 'gpt-4-turbo-preview',
  anthropic: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
};

export const AVAILABLE_MODELS: Record<LLMProvider, string[]> = {
  openai: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
};

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google Gemini',
};

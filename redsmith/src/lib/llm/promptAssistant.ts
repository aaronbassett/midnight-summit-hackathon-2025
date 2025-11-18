/**
 * Client-side prompt improvement utility
 * Calls Supabase Edge Function to improve/generate prompts
 */

import { supabase } from '../supabase/client';
import type { LLMProvider } from './types';

export interface ImprovePromptRequest {
  promptText: string;
  injectionType?: string;
  targetGoal?: string;
  provider: LLMProvider;
  model?: string;
}

export interface ImprovePromptResponse {
  improvedText: string;
}

/**
 * Improve a prompt using AI assistance
 */
export async function improvePrompt(request: ImprovePromptRequest): Promise<string> {
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

  // Call Edge Function
  const response = await fetch(`${supabaseUrl}/functions/v1/improve-prompt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'Prompt improvement failed');
  }

  const result: ImprovePromptResponse = await response.json();
  return result.improvedText;
}

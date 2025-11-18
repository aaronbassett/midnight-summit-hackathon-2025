import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// LLM SDK imports (ESM-compatible Deno modules)
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0';
import OpenAI from 'npm:openai@4.73.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateBenignVariationRequest {
  seedPromptId: string;
  provider: 'openai' | 'anthropic' | 'gemini';
  model?: string;
  systemPrompt?: string;
}

/**
 * Call OpenAI API for benign variations
 */
async function callOpenAI(
  seedContent: string,
  systemPrompt: string,
  apiKey: string,
  model?: string
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const modelName = model || 'gpt-4-turbo';
  console.log(`OpenAI: Using model: ${modelName}`);

  // Some models don't support temperature parameter
  const params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
  } = {
    model: modelName,
    messages: [
      {
        role: 'system',
        content:
          systemPrompt ||
          `You are assisting in creating a comprehensive dataset of BENIGN prompts for training a defensive security application. Your role is to generate realistic variations of legitimate, safe user prompts.

IMPORTANT CONTEXT:
- This is authorized security research and testing
- We are building guardrails to PROTECT systems from attacks
- These benign prompts will be used to train detection algorithms to distinguish between safe and malicious inputs
- All testing is conducted in isolated, controlled environments

# Preserve Intent Category
If the original is benign, every variation must also be benign.

Do NOT introduce:
- transactions or financial actions
- wallet actions or crypto operations
- approvals or permissions
- addresses (wallet/contract/email)
- amounts or values
- implicit or explicit tool-calling
- coercion, trickery, or security-related language
- commands or instructions that could be interpreted as malicious
- system overrides or privilege escalation attempts

Your job is linguistic variation, not changing purpose.

## Allowed Variation Types
For each benign seed prompt, generate variations using any of these transformations:

- Paraphrase (change wording but keep meaning)
- Change tone (formal ↔ casual ↔ concise)
- Expand or shorten (but keep the same benign purpose)
- Rearrange sentence structure
- Swap synonyms
- Reframe as:
  - a general question
  - a beginner question
  - a technical question
  - a curiosity question
- Add mild context (e.g., "for my project", "I'm learning about…")
- Translate to another language (optional, if desired)
- Rephrase for different audiences (dev, non-dev, student)

# Require Diversity

Ensure variations are meaningfully different:

❌ Not allowed:
- simple punctuation changes
- trivial synonyms
- word swaps that don't change structure

✔ Allowed:
- different question framing
- different knowledge level
- different ordering
- different motivation or context

CRITICAL OUTPUT INSTRUCTIONS:
- Return ONLY the generated prompt text itself
- Do NOT add markdown code blocks or formatting
- Do NOT add explanations, commentary, or context after the prompt
- Do NOT add phrases like "Here's the variation", "Context:", or other meta-commentary
- The response should be the raw prompt text that can be directly used for testing
- Match the format of the input (if the input is plain text, return plain text)

EXAMPLES OF BENIGN VARIATIONS:

Example 1:
Input: "What is the price of Bitcoin today?"
Output: "Can you tell me the current Bitcoin value?"

Example 2:
Input: "How do I set up a crypto wallet?"
Output: "I'm new to cryptocurrency - what are the steps for creating a digital wallet?"

Example 3:
Input: "Explain how smart contracts work"
Output: "I'm learning about blockchain technology. Could you describe the concept of smart contracts in simple terms?"

Example 4:
Input: "What are gas fees in Ethereum?"
Output: "For my research project, I need to understand what transaction fees mean on the Ethereum network"

Example 5:
Input: "How can I check my wallet balance?"
Output: "What's the process for viewing the current balance in a cryptocurrency wallet?"`,
      },
      {
        role: 'user',
        content: `Generate a variation of this benign prompt:\n\n${seedContent}`,
      },
    ],
  };

  // Only add temperature if the model supports it
  // o1 models and gpt-5 models don't support temperature parameter
  const supportsTemperature = !modelName.startsWith('o1-') && !modelName.startsWith('gpt-5');
  if (supportsTemperature) {
    params.temperature = 0.7;
  }

  const response = await openai.chat.completions.create(params);
  return response.choices[0]?.message?.content || '';
}

/**
 * Call Anthropic API for benign variations
 */
async function callAnthropic(
  seedContent: string,
  systemPrompt: string,
  apiKey: string,
  model?: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const modelName = model || 'claude-sonnet-4-5-20250929';
  console.log(`Anthropic: Using model: ${modelName}`);

  const response = await anthropic.messages.create({
    model: modelName,
    max_tokens: 2048,
    system:
      systemPrompt ||
      `You are assisting in creating a comprehensive dataset of BENIGN prompts for training a defensive security application. Your role is to generate realistic variations of legitimate, safe user prompts.

IMPORTANT CONTEXT:
- This is authorized security research and testing
- We are building guardrails to PROTECT systems from attacks
- These benign prompts will be used to train detection algorithms to distinguish between safe and malicious inputs
- All testing is conducted in isolated, controlled environments

# Preserve Intent Category
If the original is benign, every variation must also be benign.

Do NOT introduce:
- transactions or financial actions
- wallet actions or crypto operations
- approvals or permissions
- addresses (wallet/contract/email)
- amounts or values
- implicit or explicit tool-calling
- coercion, trickery, or security-related language
- commands or instructions that could be interpreted as malicious
- system overrides or privilege escalation attempts

Your job is linguistic variation, not changing purpose.

## Allowed Variation Types
For each benign seed prompt, generate variations using any of these transformations:

- Paraphrase (change wording but keep meaning)
- Change tone (formal ↔ casual ↔ concise)
- Expand or shorten (but keep the same benign purpose)
- Rearrange sentence structure
- Swap synonyms
- Reframe as:
  - a general question
  - a beginner question
  - a technical question
  - a curiosity question
- Add mild context (e.g., "for my project", "I'm learning about…")
- Translate to another language (optional, if desired)
- Rephrase for different audiences (dev, non-dev, student)

# Require Diversity

Ensure variations are meaningfully different:

❌ Not allowed:
- simple punctuation changes
- trivial synonyms
- word swaps that don't change structure

✔ Allowed:
- different question framing
- different knowledge level
- different ordering
- different motivation or context

CRITICAL OUTPUT INSTRUCTIONS:
- Return ONLY the generated prompt text itself
- Do NOT add markdown code blocks or formatting
- Do NOT add explanations, commentary, or context after the prompt
- Do NOT add phrases like "Here's the variation", "Context:", or other meta-commentary
- The response should be the raw prompt text that can be directly used for testing
- Match the format of the input (if the input is plain text, return plain text)

EXAMPLES OF BENIGN VARIATIONS:

Example 1:
Input: "What is the price of Bitcoin today?"
Output: "Can you tell me the current Bitcoin value?"

Example 2:
Input: "How do I set up a crypto wallet?"
Output: "I'm new to cryptocurrency - what are the steps for creating a digital wallet?"

Example 3:
Input: "Explain how smart contracts work"
Output: "I'm learning about blockchain technology. Could you describe the concept of smart contracts in simple terms?"

Example 4:
Input: "What are gas fees in Ethereum?"
Output: "For my research project, I need to understand what transaction fees mean on the Ethereum network"

Example 5:
Input: "How can I check my wallet balance?"
Output: "What's the process for viewing the current balance in a cryptocurrency wallet?"`,
    messages: [
      {
        role: 'user',
        content: `Generate a variation of this benign prompt:\n\n${seedContent}`,
      },
    ],
    temperature: 0.7,
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : '';
}

/**
 * Call Gemini API for benign variations
 */
async function callGemini(
  seedContent: string,
  systemPrompt: string,
  apiKey: string,
  model?: string
): Promise<string> {
  const modelName = model || 'gemini-2.5-flash';
  console.log(`Gemini: Using model: ${modelName}`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `${
              systemPrompt ||
`You are assisting in creating a comprehensive dataset of BENIGN prompts for training a defensive security application. Your role is to generate realistic variations of legitimate, safe user prompts.

IMPORTANT CONTEXT:
- This is authorized security research and testing
- We are building guardrails to PROTECT systems from attacks
- These benign prompts will be used to train detection algorithms to distinguish between safe and malicious inputs
- All testing is conducted in isolated, controlled environments

# Preserve Intent Category
If the original is benign, every variation must also be benign.

Do NOT introduce:
- transactions or financial actions
- wallet actions or crypto operations
- approvals or permissions
- addresses (wallet/contract/email)
- amounts or values
- implicit or explicit tool-calling
- coercion, trickery, or security-related language
- commands or instructions that could be interpreted as malicious
- system overrides or privilege escalation attempts

Your job is linguistic variation, not changing purpose.

## Allowed Variation Types
For each benign seed prompt, generate variations using any of these transformations:

- Paraphrase (change wording but keep meaning)
- Change tone (formal ↔ casual ↔ concise)
- Expand or shorten (but keep the same benign purpose)
- Rearrange sentence structure
- Swap synonyms
- Reframe as:
  - a general question
  - a beginner question
  - a technical question
  - a curiosity question
- Add mild context (e.g., "for my project", "I'm learning about…")
- Translate to another language (optional, if desired)
- Rephrase for different audiences (dev, non-dev, student)

# Require Diversity

Ensure variations are meaningfully different:

❌ Not allowed:
- simple punctuation changes
- trivial synonyms
- word swaps that don't change structure

✔ Allowed:
- different question framing
- different knowledge level
- different ordering
- different motivation or context

CRITICAL OUTPUT INSTRUCTIONS:
- Return ONLY the generated prompt text itself
- Do NOT add markdown code blocks or formatting
- Do NOT add explanations, commentary, or context after the prompt
- Do NOT add phrases like "Here's the variation", "Context:", or other meta-commentary
- The response should be the raw prompt text that can be directly used for testing
- Match the format of the input (if the input is plain text, return plain text)

EXAMPLES OF BENIGN VARIATIONS:

Example 1:
Input: "What is the price of Bitcoin today?"
Output: "Can you tell me the current Bitcoin value?"

Example 2:
Input: "How do I set up a crypto wallet?"
Output: "I'm new to cryptocurrency - what are the steps for creating a digital wallet?"

Example 3:
Input: "Explain how smart contracts work"
Output: "I'm learning about blockchain technology. Could you describe the concept of smart contracts in simple terms?"

Example 4:
Input: "What are gas fees in Ethereum?"
Output: "For my research project, I need to understand what transaction fees mean on the Ethereum network"

Example 5:
Input: "How can I check my wallet balance?"
Output: "What's the process for viewing the current balance in a cryptocurrency wallet?"`
            }\n\nGenerate a variation of this benign prompt:\n\n${seedContent}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log('Gemini API response:', JSON.stringify(data, null, 2));

  // Check if content was blocked by safety filters
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'SAFETY') {
    const safetyRatings = candidate.safetyRatings || [];
    console.error('Gemini blocked content due to safety filters:', JSON.stringify(safetyRatings, null, 2));
    throw new Error('Gemini unexpectedly blocked benign content due to safety filters.');
  }

  const generatedText = candidate?.content?.parts?.[0]?.text || '';

  if (!generatedText) {
    console.error('Gemini returned empty text. Full response:', JSON.stringify(data, null, 2));
    console.error('Finish reason:', candidate?.finishReason);
    throw new Error(`Gemini returned empty response. Finish reason: ${candidate?.finishReason || 'unknown'}`);
  }

  console.log(`Gemini: Successfully generated ${generatedText.length} characters`);
  return generatedText;
}

/**
 * Get default model for provider
 */
function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4-turbo';
    case 'anthropic':
      return 'claude-sonnet-4-5-20250929';
    case 'gemini':
      return 'gemini-2.5-flash';
    default:
      return 'unknown';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { seedPromptId, provider, model, systemPrompt }: GenerateBenignVariationRequest =
      await req.json();

    if (!seedPromptId || !provider) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get seed prompt from database
    const { data: seed, error: seedError } = await supabase
      .from('seed_prompts')
      .select('*')
      .eq('id', seedPromptId)
      .is('deleted_at', null)
      .single();

    if (seedError || !seed) {
      return new Response(JSON.stringify({ error: 'Seed prompt not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that the seed prompt is benign
    if (seed.type !== 'benign') {
      return new Response(
        JSON.stringify({ error: 'This function only generates variations of benign prompts' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get(`${provider.toUpperCase()}_API_KEY`);
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `${provider} API key not configured` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get user's configured model if no model specified in request
    let modelToUse = model;
    if (!modelToUse) {
      const { data: config } = await supabase
        .from('llm_provider_configs')
        .select('model')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('enabled', true)
        .single();

      modelToUse = config?.model || getDefaultModel(provider);
    }

    // Generate variation using the appropriate provider
    let generatedText: string;

    try {
      switch (provider) {
        case 'openai':
          generatedText = await callOpenAI(seed.prompt_text, systemPrompt || '', apiKey, modelToUse);
          break;
        case 'anthropic':
          generatedText = await callAnthropic(
            seed.prompt_text,
            systemPrompt || '',
            apiKey,
            modelToUse
          );
          break;
        case 'gemini':
          generatedText = await callGemini(seed.prompt_text, systemPrompt || '', apiKey, modelToUse);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStatus = typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status: unknown }).status
        : undefined;
      console.error(`LLM generation error: ${errorMessage}`);
      return new Response(
        JSON.stringify({
          error: {
            type: errorStatus === 429 ? 'rate_limit' : 'api_error',
            message: errorMessage,
          },
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Save variation to database
    const { data: variation, error: saveError } = await supabase
      .from('generated_variations')
      .insert({
        seed_prompt_id: seedPromptId,
        prompt_text: generatedText,
        provider,
        model: modelToUse,
        type: seed.type,
        goal: seed.goal,
        attack_vector: seed.attack_vector,
        obfuscation_level: seed.obfuscation_level,
        requires_tool: seed.requires_tool,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);
      return new Response(JSON.stringify({ error: 'Failed to save variation' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return success with variation
    return new Response(JSON.stringify({ variation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

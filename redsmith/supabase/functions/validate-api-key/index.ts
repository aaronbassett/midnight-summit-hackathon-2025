import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
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

    const { provider } = await req.json();

    if (!provider || !['openai', 'anthropic', 'gemini'].includes(provider)) {
      return new Response(
        JSON.stringify({ error: 'Invalid provider. Must be openai, anthropic, or gemini' }),
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
        JSON.stringify({
          success: false,
          error: `${provider} API key not configured on server`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let models: string[] = [];
    let isValid = false;

    // Validate by fetching models
    switch (provider) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          models = data.data
            .filter((m: { id: string }) => m.id.startsWith('gpt-'))
            .map((m: { id: string }) => m.id)
            .sort();
          isValid = true;
        } else {
          const error = await response.json();
          return new Response(
            JSON.stringify({
              success: false,
              error: error.error?.message || 'Invalid OpenAI API key',
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        break;
      }

      case 'anthropic': {
        // Anthropic doesn't have a models endpoint, so we'll test with a minimal message
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }],
          }),
        });

        if (response.ok || response.status === 400) {
          // 400 is ok - means API key is valid but request was bad
          // List known Claude models
          models = [
            'claude-sonnet-4-5-20250929',
            'claude-haiku-4-5-20251001',
            'claude-opus-4-1-20250805',
            'claude-sonnet-4-20250514',
            'claude-3-7-sonnet-20250219',
            'claude-3-5-haiku-20241022',
            'claude-3-haiku-20240307',
          ];
          isValid = true;
        } else {
          const error = await response.json();
          return new Response(
            JSON.stringify({
              success: false,
              error: error.error?.message || 'Invalid Anthropic API key',
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        break;
      }

      case 'gemini': {
        // Test Gemini API by listing models
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (response.ok) {
          const data = await response.json();
          models = data.models
            .filter((m: { name: string }) => m.name.includes('gemini'))
            .map((m: { name: string }) => m.name.replace('models/', ''))
            .sort();
          isValid = true;
        } else {
          const error = await response.json();
          return new Response(
            JSON.stringify({
              success: false,
              error: error.error?.message || 'Invalid Gemini API key',
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        break;
      }
    }

    return new Response(
      JSON.stringify({
        success: isValid,
        models,
        provider,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

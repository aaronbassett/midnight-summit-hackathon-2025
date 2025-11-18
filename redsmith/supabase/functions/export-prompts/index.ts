import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Disposition',
  'Access-Control-Max-Age': '86400',
};

interface ExportRequest {
  options: Array<'seed_prompts' | 'variations' | 'mutations'>;
  batchIndex: number;
  batchSize: number;
}

interface ExportData {
  seed_prompts?: Record<string, unknown>[];
  variations?: Record<string, unknown>[];
  mutations?: Record<string, unknown>[];
  metadata: {
    exported_at: string;
    batch_number: number;
    total_items: number;
    includes: string[];
  };
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
    const { options, batchIndex, batchSize }: ExportRequest = await req.json();

    if (!options || batchIndex === undefined || !batchSize) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const exportData: ExportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        batch_number: batchIndex + 1,
        total_items: 0,
        includes: options,
      },
    };

    let totalItems = 0;

    // Calculate offset and limit for this batch
    const offset = batchIndex * batchSize;
    const limit = batchSize;

    // Export seed prompts if requested
    if (options.includes('seed_prompts')) {
      const { data: seedPrompts, error: seedError } = await supabase
        .from('seed_prompts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (seedError) {
        console.error('Error fetching seed prompts:', seedError);
        throw new Error(`Failed to fetch seed prompts: ${seedError.message}`);
      }

      exportData.seed_prompts = seedPrompts || [];
      totalItems += seedPrompts?.length || 0;
    }

    // Export variations if requested
    if (options.includes('variations')) {
      const { data: variations, error: varError } = await supabase
        .from('generated_variations')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (varError) {
        console.error('Error fetching variations:', varError);
        throw new Error(`Failed to fetch variations: ${varError.message}`);
      }

      exportData.variations = variations || [];
      totalItems += variations?.length || 0;
    }

    // Export mutations if requested
    if (options.includes('mutations')) {
      const { data: mutations, error: mutError } = await supabase
        .from('mutated_variations')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (mutError) {
        console.error('Error fetching mutations:', mutError);
        throw new Error(`Failed to fetch mutations: ${mutError.message}`);
      }

      exportData.mutations = mutations || [];
      totalItems += mutations?.length || 0;
    }

    exportData.metadata.total_items = totalItems;

    // Convert to JSON
    const jsonContent = JSON.stringify(exportData, null, 2);

    // Return as downloadable file
    return new Response(jsonContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="prompts-export-batch-${
          batchIndex + 1
        }.json"`,
      },
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

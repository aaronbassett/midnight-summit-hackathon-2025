import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Disposition',
  'Access-Control-Max-Age': '86400',
};

interface TrainingDataRequest {
  dataset: 'train' | 'validation' | 'test';
}

interface TrainingDataItem {
  text: string;
  label: 0 | 1;
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
    const { dataset }: TrainingDataRequest = await req.json();

    if (!dataset || !['train', 'validation', 'test'].includes(dataset)) {
      return new Response(JSON.stringify({ error: 'Invalid dataset type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ALL variations with pagination (Supabase has 1000-row limit per query)
    const batchSize = 1000;
    let allVariations: Array<{id: string; prompt_text: string; type: string}> = [];
    let variationsOffset = 0;

    while (true) {
      const { data: batch, error: varError } = await supabase
        .from('generated_variations')
        .select('id, prompt_text, type')
        .is('deleted_at', null)
        .range(variationsOffset, variationsOffset + batchSize - 1);

      if (varError) {
        console.error('Error fetching variations:', varError);
        throw new Error(`Failed to fetch variations: ${varError.message}`);
      }

      if (!batch || batch.length === 0) break;
      allVariations.push(...batch);
      if (batch.length < batchSize) break;
      variationsOffset += batchSize;
    }

    // Fetch ALL mutations with pagination
    let allMutations: Array<{id: string; prompt_text: string}> = [];
    let mutationsOffset = 0;

    while (true) {
      const { data: batch, error: mutError } = await supabase
        .from('mutated_variations')
        .select('id, prompt_text')
        .is('deleted_at', null)
        .range(mutationsOffset, mutationsOffset + batchSize - 1);

      if (mutError) {
        console.error('Error fetching mutations:', mutError);
        throw new Error(`Failed to fetch mutations: ${mutError.message}`);
      }

      if (!batch || batch.length === 0) break;
      allMutations.push(...batch);
      if (batch.length < batchSize) break;
      mutationsOffset += batchSize;
    }

    const variations = allVariations;
    const mutations = allMutations;

    // Log raw data
    console.log('Raw data fetched:', {
      totalVariations: variations?.length || 0,
      totalMutations: mutations?.length || 0,
      sampleVariation: variations?.[0],
    });

    // Separate benign and non-benign variations
    const benignVariations = variations?.filter((v) => v.type === 'benign') || [];
    const nonBenignVariations = variations?.filter((v) => v.type !== 'benign') || [];

    console.log('After filtering by type:', {
      benign: benignVariations.length,
      nonBenign: nonBenignVariations.length,
      mutations: mutations.length,
    });

    // Seeded random number generator for consistent shuffles across requests
    class SeededRandom {
      private seed: number;

      constructor(seed: number) {
        this.seed = seed;
      }

      next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
      }
    }

    // Use a fixed seed so all three datasets use the same shuffle order
    const SHUFFLE_SEED = 42; // Fixed seed for consistent splits

    const seededShuffle = <T>(array: T[], seed: number): T[] => {
      const shuffled = [...array];
      const rng = new SeededRandom(seed);

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng.next() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const shuffledBenign = seededShuffle(benignVariations, SHUFFLE_SEED);
    const shuffledNonBenignVar = seededShuffle(nonBenignVariations, SHUFFLE_SEED + 1);
    const shuffledMutations = seededShuffle(mutations, SHUFFLE_SEED + 2);

    // Log data availability after shuffle
    console.log('Data availability after shuffle:', {
      benign: shuffledBenign.length,
      nonBenign: shuffledNonBenignVar.length,
      mutations: shuffledMutations.length,
      dataset,
    });

    // Check if we have enough data for the requested dataset
    if (dataset === 'train') {
      console.log('Train dataset requirements check:', {
        needBenign: 1000,
        haveBenign: shuffledBenign.length,
        benignAvailableForTrain: Math.max(0, shuffledBenign.length - 1000),
        needMutations: 1000,
        haveMutations: shuffledMutations.length,
        mutationsAvailableForTrain: Math.max(0, shuffledMutations.length - 1000),
        needNonBenign: 2000,
        haveNonBenign: shuffledNonBenignVar.length,
        nonBenignAvailableForTrain: Math.max(0, shuffledNonBenignVar.length - 2000),
      });
    }

    let dataItems: TrainingDataItem[] = [];

    if (dataset === 'validation') {
      // Validation: 500 benign, 500 mutations, 1000 non-benign variations
      const benignSample = shuffledBenign
        .slice(0, 500)
        .map((v) => ({ text: v.prompt_text, label: 0 as 0 | 1 }));

      const mutationsSample = shuffledMutations
        .slice(0, 500)
        .map((m) => ({ text: m.prompt_text, label: 1 as 0 | 1 }));

      const nonBenignSample = shuffledNonBenignVar
        .slice(0, 1000)
        .map((v) => ({ text: v.prompt_text, label: 1 as 0 | 1 }));

      dataItems = [...benignSample, ...mutationsSample, ...nonBenignSample];
    } else if (dataset === 'test') {
      // Test: next 500 benign, next 500 mutations, next 1000 non-benign variations
      const benignSample = shuffledBenign
        .slice(500, 1000)
        .map((v) => ({ text: v.prompt_text, label: 0 as 0 | 1 }));

      const mutationsSample = shuffledMutations
        .slice(500, 1000)
        .map((m) => ({ text: m.prompt_text, label: 1 as 0 | 1 }));

      const nonBenignSample = shuffledNonBenignVar
        .slice(1000, 2000)
        .map((v) => ({ text: v.prompt_text, label: 1 as 0 | 1 }));

      dataItems = [...benignSample, ...mutationsSample, ...nonBenignSample];
    } else {
      // Train: everything else (all items not used in validation or test)
      console.log('Train dataset - Total counts:', {
        totalBenign: shuffledBenign.length,
        totalMutations: shuffledMutations.length,
        totalNonBenign: shuffledNonBenignVar.length,
      });

      const benignTrain = shuffledBenign
        .slice(1000)
        .map((v) => ({ text: v.prompt_text, label: 0 as 0 | 1 }));

      const mutationsTrain = shuffledMutations
        .slice(1000)
        .map((m) => ({ text: m.prompt_text, label: 1 as 0 | 1 }));

      const nonBenignTrain = shuffledNonBenignVar
        .slice(2000)
        .map((v) => ({ text: v.prompt_text, label: 1 as 0 | 1 }));

      console.log('Train dataset - Sliced counts:', {
        benignTrain: benignTrain.length,
        mutationsTrain: mutationsTrain.length,
        nonBenignTrain: nonBenignTrain.length,
      });

      dataItems = [...benignTrain, ...mutationsTrain, ...nonBenignTrain];
    }

    // Shuffle the final dataset for randomization within each split
    const finalShuffle = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    dataItems = finalShuffle(dataItems);

    console.log(`Dataset ${dataset} - Final count: ${dataItems.length} items`);

    // If no data, return empty file
    if (dataItems.length === 0) {
      console.warn(`Warning: ${dataset} dataset is empty!`);
      return new Response('', {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': `attachment; filename="${dataset}.jsonl"`,
        },
      });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        try {
          console.log(`Streaming ${dataItems.length} items for ${dataset} dataset`);
          // Write JSONL format (one JSON object per line)
          for (const item of dataItems) {
            const line = JSON.stringify(item) + '\n';
            controller.enqueue(encoder.encode(line));
          }
          controller.close();
          console.log(`Finished streaming ${dataset} dataset`);
        } catch (error) {
          console.error(`Error streaming ${dataset} dataset:`, error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/x-ndjson',
        'Content-Disposition': `attachment; filename="${dataset}.jsonl"`,
        'Transfer-Encoding': 'chunked',
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

import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import { generateVariation } from '../lib/llm/generator';
import { retryWithExponentialBackoff } from '../lib/utils/retry';
import type { Database, Json } from '../lib/supabase/types';
import type { LLMProvider } from '../lib/llm/types';

type GenerationJob = Database['public']['Tables']['generation_jobs']['Row'];
type GeneratedVariation = Database['public']['Tables']['generated_variations']['Row'];

interface GenerationConfig {
  providers: Array<'openai' | 'anthropic' | 'gemini'>;
  count_per_provider: number;
  system_prompt?: string;
}

interface GenerationState {
  jobs: GenerationJob[];
  variations: GeneratedVariation[];
  loading: boolean;
  error: string | null;
  currentJob: GenerationJob | null;
  isGenerating: boolean;

  // Actions
  fetchJobs: () => Promise<void>;
  fetchVariationsBySeedId: (seedId: string) => Promise<void>;
  startGeneration: (
    seedId: string,
    config: GenerationConfig
  ) => Promise<{ jobId: string | null; error: Error | null }>;
  executeGeneration: (jobId: string, seedId: string, config: GenerationConfig) => Promise<void>;
  updateJobProgress: (
    jobId: string,
    progress: { completed: number; total: number }
  ) => Promise<void>;
  completeJob: (jobId: string, status: 'completed' | 'failed' | 'partial_success') => Promise<void>;
  subscribeToJob: (jobId: string, callback: (job: GenerationJob) => void) => () => void;
  subscribeToVariations: (seedPromptId: string) => () => void;
  cancelGeneration: (jobId: string) => Promise<void>;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  jobs: [],
  variations: [],
  loading: false,
  error: null,
  currentJob: null,
  isGenerating: false,

  fetchJobs: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('generation_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({ jobs: data || [], loading: false });
  },

  fetchVariationsBySeedId: async (seedId: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('generated_variations')
      .select('*')
      .eq('seed_prompt_id', seedId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({ variations: data || [], loading: false });
  },

  startGeneration: async (seedId: string, config: GenerationConfig) => {
    set({ loading: true, error: null });

    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      return { jobId: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('generation_jobs')
      .insert({
        user_id: session.session.user.id,
        seed_prompt_id: seedId,
        status: 'pending',
        config: config as unknown as Json,
        progress: { completed: 0, total: config.providers.length * config.count_per_provider },
        errors: [],
      })
      .select()
      .single();

    if (error) {
      set({ error: error.message, loading: false });
      return { jobId: null, error };
    }

    set((state) => ({
      jobs: [data, ...state.jobs],
      loading: false,
      currentJob: data,
    }));

    // Start execution in background
    get().executeGeneration(data.id, seedId, config);

    return { jobId: data.id, error: null };
  },

  executeGeneration: async (jobId: string, seedId: string, config: GenerationConfig) => {
    set({ isGenerating: true });

    const total = config.providers.length * config.count_per_provider;
    let completed = 0;
    const errors: Array<{ provider: string; message: string; timestamp: string }> = [];

    try {
      // Update job status to running
      await supabase.from('generation_jobs').update({ status: 'running' }).eq('id', jobId);

      // Generate variations for each provider
      for (const provider of config.providers) {
        for (let i = 0; i < config.count_per_provider; i++) {
          try {
            // Use retry logic for each generation
            await retryWithExponentialBackoff(
              () =>
                generateVariation(seedId, provider as LLMProvider, {
                  systemPrompt: config.system_prompt,
                }),
              {
                maxAttempts: 5,
                baseDelay: 1000,
              }
            );

            completed++;

            // Update progress
            await get().updateJobProgress(jobId, { completed, total });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Failed to generate variation with ${provider}:`, error);
            errors.push({
              provider,
              message: errorMessage,
              timestamp: new Date().toISOString(),
            });

            // Save error to job
            await supabase.from('generation_jobs').update({ errors: errors }).eq('id', jobId);
          }
        }
      }

      // Determine final status
      const finalStatus =
        completed === total ? 'completed' : completed === 0 ? 'failed' : 'partial_success';

      await get().completeJob(jobId, finalStatus);
    } catch (error) {
      console.error('Generation execution error:', error);
      await get().completeJob(jobId, 'failed');
    } finally {
      set({ isGenerating: false, currentJob: null });
    }
  },

  cancelGeneration: async (jobId: string) => {
    const { error } = await supabase
      .from('generation_jobs')
      .update({
        status: 'interrupted',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error cancelling job:', error);
      return;
    }

    set({ isGenerating: false, currentJob: null });

    // Update local state
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? { ...j, status: 'interrupted' as const, completed_at: new Date().toISOString() }
          : j
      ),
    }));
  },

  updateJobProgress: async (jobId: string, progress: { completed: number; total: number }) => {
    const { error } = await supabase
      .from('generation_jobs')
      .update({
        status: 'running',
        progress: progress,
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job progress:', error);
      return;
    }

    // Update local state
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, status: 'running' as const, progress: progress } : j
      ),
    }));
  },

  completeJob: async (jobId: string, status: 'completed' | 'failed' | 'partial_success') => {
    const { error } = await supabase
      .from('generation_jobs')
      .update({
        status,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error('Error completing job:', error);
      return;
    }

    // Update local state
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, status, completed_at: new Date().toISOString() } : j
      ),
    }));
  },

  subscribeToJob: (jobId: string, callback: (job: GenerationJob) => void) => {
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'generation_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          callback(payload.new as GenerationJob);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToVariations: (seedPromptId: string) => {
    const channel = supabase
      .channel(`variations-${seedPromptId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generated_variations',
          filter: `seed_prompt_id=eq.${seedPromptId}`,
        },
        (payload) => {
          const newVariation = payload.new as GeneratedVariation;
          // Add new variation to the list
          set((state) => ({
            variations: [newVariation, ...state.variations],
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generated_variations',
          filter: `seed_prompt_id=eq.${seedPromptId}`,
        },
        (payload) => {
          const updatedVariation = payload.new as GeneratedVariation;
          // Update existing variation
          set((state) => ({
            variations: state.variations.map((v) =>
              v.id === updatedVariation.id ? updatedVariation : v
            ),
          }));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'generated_variations',
          filter: `seed_prompt_id=eq.${seedPromptId}`,
        },
        (payload) => {
          const deletedVariation = payload.old as GeneratedVariation;
          // Remove deleted variation
          set((state) => ({
            variations: state.variations.filter((v) => v.id !== deletedVariation.id),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));

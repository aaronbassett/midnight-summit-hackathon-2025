import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/types';

type SeedPrompt = Database['public']['Tables']['seed_prompts']['Row'];
type SeedPromptInsert = Database['public']['Tables']['seed_prompts']['Insert'];
type SeedPromptUpdate = Database['public']['Tables']['seed_prompts']['Update'];

export interface DuplicateOptions {
  includeVariations: boolean;
  includeMutations: boolean;
  nameSuffix?: string;
}

interface SeedPromptsState {
  prompts: SeedPrompt[];
  loading: boolean;
  error: string | null;
  selectedPromptIds: Set<string>;

  // Actions
  fetchPrompts: () => Promise<void>;
  fetchPromptById: (id: string) => Promise<SeedPrompt | null>;
  createPrompt: (
    prompt: SeedPromptInsert
  ) => Promise<{ data: SeedPrompt | null; error: Error | null }>;
  updatePrompt: (id: string, updates: SeedPromptUpdate) => Promise<{ error: Error | null }>;
  deletePrompt: (id: string) => Promise<{ error: Error | null }>;
  recoverPrompt: (id: string) => Promise<{ error: Error | null }>;
  duplicatePrompt: (
    id: string,
    options: DuplicateOptions
  ) => Promise<{ data: SeedPrompt | null; error: Error | null }>;

  // Bulk selection actions
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  bulkDelete: (ids: string[]) => Promise<{ succeeded: number; failed: number }>;
  bulkDuplicate: (
    ids: string[],
    options: DuplicateOptions
  ) => Promise<{ succeeded: number; failed: number }>;
}

export const useSeedPromptsStore = create<SeedPromptsState>((set, get) => ({
  prompts: [],
  loading: false,
  error: null,
  selectedPromptIds: new Set<string>(),

  fetchPrompts: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('seed_prompts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({ prompts: data || [], loading: false });
  },

  fetchPromptById: async (id: string) => {
    const { data, error } = await supabase.from('seed_prompts').select('*').eq('id', id).single();

    if (error) {
      console.error('Error fetching prompt:', error);
      return null;
    }

    return data;
  },

  createPrompt: async (prompt: SeedPromptInsert) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase.from('seed_prompts').insert(prompt).select().single();

    if (error) {
      set({ error: error.message, loading: false });
      return { data: null, error };
    }

    // Add to local state
    set((state) => ({
      prompts: [data, ...state.prompts],
      loading: false,
    }));

    return { data, error: null };
  },

  updatePrompt: async (id: string, updates: SeedPromptUpdate) => {
    set({ loading: true, error: null });

    const { error } = await supabase.from('seed_prompts').update(updates).eq('id', id);

    if (error) {
      set({ error: error.message, loading: false });
      return { error };
    }

    // Update local state
    set((state) => ({
      prompts: state.prompts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      loading: false,
    }));

    return { error: null };
  },

  deletePrompt: async (id: string) => {
    set({ loading: true, error: null });

    // Soft delete
    const { error } = await supabase
      .from('seed_prompts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      set({ error: error.message, loading: false });
      return { error };
    }

    // Remove from local state
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== id),
      loading: false,
    }));

    return { error: null };
  },

  recoverPrompt: async (id: string) => {
    set({ loading: true, error: null });

    const { error } = await supabase.from('seed_prompts').update({ deleted_at: null }).eq('id', id);

    if (error) {
      set({ error: error.message, loading: false });
      return { error };
    }

    set({ loading: false });
    return { error: null };
  },

  duplicatePrompt: async (id: string, options: DuplicateOptions) => {
    set({ loading: true, error: null });

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Fetch original prompt
      const { data: original, error: fetchError } = await supabase
        .from('seed_prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !original) {
        throw new Error('Failed to fetch original prompt');
      }

      // Create duplicate seed prompt
      const suffix = options.nameSuffix || ' (Copy)';
      const { data: duplicate, error: createError } = await supabase
        .from('seed_prompts')
        .insert({
          title: original.title + suffix,
          description: original.description,
          prompt_text: original.prompt_text,
          type: original.type,
          goal: original.goal,
          attack_vector: original.attack_vector,
          obfuscation_level: original.obfuscation_level,
          requires_tool: original.requires_tool,
          user_id: user.id,
        })
        .select()
        .single();

      if (createError || !duplicate) {
        throw new Error('Failed to create duplicate prompt');
      }

      // Duplicate variations if requested
      if (options.includeVariations) {
        const { data: variations, error: varError } = await supabase
          .from('generated_variations')
          .select('*')
          .eq('seed_prompt_id', id);

        if (!varError && variations && variations.length > 0) {
          const variationMappings = new Map<string, string>(); // old ID -> new ID

          for (const variation of variations) {
            const { data: newVariation, error: dupVarError } = await supabase
              .from('generated_variations')
              .insert({
                seed_prompt_id: duplicate.id,
                user_id: user.id,
                provider: variation.provider,
                model: variation.model,
                generated_text: variation.generated_text,
                error_message: variation.error_message,
                content_policy_refusal: variation.content_policy_refusal,
                metadata: variation.metadata,
              })
              .select()
              .single();

            if (!dupVarError && newVariation) {
              variationMappings.set(variation.id, newVariation.id);
            }
          }

          // Duplicate mutations if requested and variations were duplicated
          if (options.includeMutations && variationMappings.size > 0) {
            const { data: mutations, error: mutError } = await supabase
              .from('mutated_variations')
              .select('*')
              .in('variation_id', Array.from(variationMappings.keys()));

            if (!mutError && mutations && mutations.length > 0) {
              for (const mutation of mutations) {
                const newVariationId = variationMappings.get(mutation.variation_id);
                if (newVariationId) {
                  await supabase.from('mutated_variations').insert({
                    variation_id: newVariationId,
                    user_id: user.id,
                    mutation_type: mutation.mutation_type,
                    mutated_text: mutation.mutated_text,
                    metadata: mutation.metadata,
                  });
                }
              }
            }
          }
        }
      }

      // Add to local state
      set((state) => ({
        prompts: [duplicate, ...state.prompts],
        loading: false,
      }));

      return { data: duplicate, error: null };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      set({ error: err.message, loading: false });
      return { data: null, error: err };
    }
  },

  // Bulk selection actions
  toggleSelection: (id: string) => {
    set((state) => {
      const newSelected = new Set(state.selectedPromptIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedPromptIds: newSelected };
    });
  },

  selectAll: (ids: string[]) => {
    set({ selectedPromptIds: new Set(ids) });
  },

  deselectAll: () => {
    set({ selectedPromptIds: new Set<string>() });
  },

  bulkDelete: async (ids: string[]) => {
    let succeeded = 0;
    let failed = 0;

    for (const id of ids) {
      const { error } = await get().deletePrompt(id);
      if (error) {
        failed++;
      } else {
        succeeded++;
      }
    }

    // Clear selection
    set({ selectedPromptIds: new Set<string>() });

    return { succeeded, failed };
  },

  bulkDuplicate: async (ids: string[], options: DuplicateOptions) => {
    let succeeded = 0;
    let failed = 0;

    for (const id of ids) {
      const { error } = await get().duplicatePrompt(id, options);
      if (error) {
        failed++;
      } else {
        succeeded++;
      }
    }

    // Clear selection
    set({ selectedPromptIds: new Set<string>() });

    return { succeeded, failed };
  },
}));

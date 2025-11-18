import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import type { Database } from '../lib/supabase/types';
import type { MutationType as EngineMutationType } from '../lib/mutations/engine';

type MutatedVariation = Database['public']['Tables']['mutated_variations']['Row'];

// Re-export MutationType from engine
export type MutationType = EngineMutationType;

interface MutationsState {
  mutations: MutatedVariation[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchMutationsByVariationId: (variationId: string) => Promise<void>;
  fetchMutationsByVariationIds: (variationIds: string[]) => Promise<void>;
  applyMutations: (
    variationId: string,
    mutations: MutationType[]
  ) => Promise<{ data: MutatedVariation[] | null; error: Error | null }>;
  subscribeToMutations: (variationIds: string[]) => () => void;
}

export const useMutationsStore = create<MutationsState>((set) => ({
  mutations: [],
  loading: false,
  error: null,

  fetchMutationsByVariationId: async (variationId: string) => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('mutated_variations')
      .select('*')
      .eq('variation_id', variationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    // Merge mutations: remove old mutations for this variation and add new ones
    set((state) => {
      const otherMutations = state.mutations.filter((m) => m.variation_id !== variationId);
      return { mutations: [...(data || []), ...otherMutations], loading: false };
    });
  },

  fetchMutationsByVariationIds: async (variationIds: string[]) => {
    if (variationIds.length === 0) {
      return;
    }

    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('mutated_variations')
      .select('*')
      .in('variation_id', variationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    // Merge mutations: remove old mutations for these variations and add new ones
    set((state) => {
      const otherMutations = state.mutations.filter((m) => !variationIds.includes(m.variation_id));
      return { mutations: [...(data || []), ...otherMutations], loading: false };
    });
  },

  applyMutations: async (variationId: string, mutationTypes: MutationType[]) => {
    set({ loading: true, error: null });

    // Get the original variation text
    const { data: variation, error: fetchError } = await supabase
      .from('generated_variations')
      .select('prompt_text')
      .eq('id', variationId)
      .single();

    if (fetchError || !variation) {
      set({ error: 'Failed to fetch variation', loading: false });
      return { data: null, error: new Error('Failed to fetch variation') };
    }

    // Apply mutations (client-side for now - TODO: move to Edge Function)
    const { applyMutationsToText } = await import('../lib/mutations/engine');
    const mutatedResults = await applyMutationsToText(variation.prompt_text, mutationTypes);

    // Save to database
    const mutationsToInsert = mutatedResults.map((result) => ({
      variation_id: variationId,
      prompt_text: result.mutated,
      mutations_applied: result.applied,
    }));

    const { data, error } = await supabase
      .from('mutated_variations')
      .insert(mutationsToInsert)
      .select();

    if (error) {
      set({ error: error.message, loading: false });
      return { data: null, error };
    }

    // Update local state
    set((state) => ({
      mutations: [...(data || []), ...state.mutations],
      loading: false,
    }));

    return { data, error: null };
  },

  subscribeToMutations: (variationIds: string[]) => {
    if (variationIds.length === 0) {
      return () => {}; // No-op unsubscribe
    }

    const channel = supabase
      .channel('mutations-all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mutated_variations',
        },
        (payload) => {
          const newMutation = payload.new as MutatedVariation;
          // Only add if it's for one of our variations and not deleted
          if (variationIds.includes(newMutation.variation_id) && !newMutation.deleted_at) {
            set((state) => ({
              mutations: [newMutation, ...state.mutations],
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mutated_variations',
        },
        (payload) => {
          const updatedMutation = payload.new as MutatedVariation;
          // Only update if it's for one of our variations
          if (variationIds.includes(updatedMutation.variation_id)) {
            set((state) => ({
              mutations: state.mutations.map((m) =>
                m.id === updatedMutation.id ? updatedMutation : m
              ),
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'mutated_variations',
        },
        (payload) => {
          const deletedMutation = payload.old as MutatedVariation;
          // Remove deleted mutation
          set((state) => ({
            mutations: state.mutations.filter((m) => m.id !== deletedMutation.id),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));

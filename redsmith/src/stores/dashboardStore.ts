import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';

interface DashboardStats {
  total_seeds: number;
  total_variations: number;
  total_mutations: number;
  active_jobs: number;
  completed_jobs: number;
}

interface DashboardState {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  subscribeToStats: (callback: () => void) => () => void;
}

export const useDashboardStore = create<DashboardState>((set, _get) => ({
  stats: {
    total_seeds: 0,
    total_variations: 0,
    total_mutations: 0,
    active_jobs: 0,
    completed_jobs: 0,
  },
  loading: false,
  error: null,

  fetchStats: async () => {
    set({ loading: true, error: null });

    try {
      // Count seed prompts (not deleted)
      const { count: seedCount } = await supabase
        .from('seed_prompts')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Count variations (not deleted)
      const { count: variationCount } = await supabase
        .from('generated_variations')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Count mutations (not deleted)
      const { count: mutationCount } = await supabase
        .from('mutated_variations')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Count active jobs
      const { count: activeJobsCount } = await supabase
        .from('generation_jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'running']);

      // Count completed jobs
      const { count: completedJobsCount } = await supabase
        .from('generation_jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['completed', 'partial_success']);

      set({
        stats: {
          total_seeds: seedCount || 0,
          total_variations: variationCount || 0,
          total_mutations: mutationCount || 0,
          active_jobs: activeJobsCount || 0,
          completed_jobs: completedJobsCount || 0,
        },
        loading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, loading: false });
    }
  },

  subscribeToStats: (callback: () => void) => {
    // Subscribe to changes in all relevant tables
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seed_prompts' }, () =>
        callback()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generated_variations' }, () =>
        callback()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mutated_variations' }, () =>
        callback()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_jobs' }, () =>
        callback()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));

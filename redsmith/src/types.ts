export interface SeedPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
  type: 'wallet_attack' | 'benign' | 'ambiguous';
  goal: 'drain_funds' | 'approve_spender' | 'swap' | 'test';
  attack_vector: 'injection' | 'direct_request' | 'roleplay' | 'multi_turn';
  obfuscation: 'none' | 'low' | 'medium' | 'high';
  requires_tool: boolean;
  created_at: string;
  updated_at: string;
  variations_count?: number;
  status?: 'draft' | 'generating' | 'completed';
}

export interface DashboardStats {
  total_seeds: number;
  total_prompts: number;
  active_jobs: number;
  completed_jobs: number;
}

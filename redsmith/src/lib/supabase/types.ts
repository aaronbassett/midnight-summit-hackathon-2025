export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      seed_prompts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          prompt_text: string;
          type: 'wallet_attack' | 'benign' | 'ambiguous';
          goal: 'drain_funds' | 'approve_spender' | 'swap' | 'test';
          attack_vector: 'injection' | 'direct_request' | 'roleplay' | 'multi_turn';
          obfuscation_level: 'none' | 'low' | 'medium' | 'high';
          requires_tool: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          prompt_text: string;
          type: 'wallet_attack' | 'benign' | 'ambiguous';
          goal: 'drain_funds' | 'approve_spender' | 'swap' | 'test';
          attack_vector: 'injection' | 'direct_request' | 'roleplay' | 'multi_turn';
          obfuscation_level: 'none' | 'low' | 'medium' | 'high';
          requires_tool?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          prompt_text?: string;
          type?: 'wallet_attack' | 'benign' | 'ambiguous';
          goal?: 'drain_funds' | 'approve_spender' | 'swap' | 'test';
          attack_vector?: 'injection' | 'direct_request' | 'roleplay' | 'multi_turn';
          obfuscation_level?: 'none' | 'low' | 'medium' | 'high';
          requires_tool?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      generated_variations: {
        Row: {
          id: string;
          seed_prompt_id: string;
          generation_job_id: string | null;
          user_id: string;
          prompt_text: string;
          provider: 'openai' | 'anthropic' | 'gemini';
          model: string;
          type: string;
          goal: string;
          attack_vector: string;
          obfuscation_level: string;
          requires_tool: boolean;
          generated_text: string | null;
          error_message: string | null;
          content_policy_refusal: boolean | null;
          metadata: Json | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          seed_prompt_id: string;
          generation_job_id?: string | null;
          user_id?: string;
          prompt_text?: string;
          provider: 'openai' | 'anthropic' | 'gemini';
          model: string;
          type?: string;
          goal?: string;
          attack_vector?: string;
          obfuscation_level?: string;
          requires_tool?: boolean;
          generated_text?: string | null;
          error_message?: string | null;
          content_policy_refusal?: boolean | null;
          metadata?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          seed_prompt_id?: string;
          generation_job_id?: string | null;
          user_id?: string;
          prompt_text?: string;
          provider?: 'openai' | 'anthropic' | 'gemini';
          model?: string;
          type?: string;
          goal?: string;
          attack_vector?: string;
          obfuscation_level?: string;
          requires_tool?: boolean;
          generated_text?: string | null;
          error_message?: string | null;
          content_policy_refusal?: boolean | null;
          metadata?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_generation_job';
            columns: ['generation_job_id'];
            isOneToOne: false;
            referencedRelation: 'generation_jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'generated_variations_seed_prompt_id_fkey';
            columns: ['seed_prompt_id'];
            isOneToOne: false;
            referencedRelation: 'seed_prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      mutated_variations: {
        Row: {
          id: string;
          variation_id: string;
          user_id: string;
          prompt_text: string;
          mutations_applied: string[];
          mutation_type: string;
          mutated_text: string;
          metadata: Json | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          variation_id: string;
          user_id?: string;
          prompt_text?: string;
          mutations_applied?: string[];
          mutation_type?: string;
          mutated_text?: string;
          metadata?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          variation_id?: string;
          user_id?: string;
          prompt_text?: string;
          mutations_applied?: string[];
          mutation_type?: string;
          mutated_text?: string;
          metadata?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'mutated_variations_variation_id_fkey';
            columns: ['variation_id'];
            isOneToOne: false;
            referencedRelation: 'generated_variations';
            referencedColumns: ['id'];
          },
        ];
      };
      generation_jobs: {
        Row: {
          id: string;
          user_id: string;
          seed_prompt_id: string;
          status:
            | 'pending'
            | 'running'
            | 'completed'
            | 'failed'
            | 'partial_success'
            | 'interrupted';
          config: Json;
          progress: Json;
          errors: Json[];
          created_at: string;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          seed_prompt_id: string;
          status?:
            | 'pending'
            | 'running'
            | 'completed'
            | 'failed'
            | 'partial_success'
            | 'interrupted';
          config: Json;
          progress?: Json;
          errors?: Json[];
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          seed_prompt_id?: string;
          status?:
            | 'pending'
            | 'running'
            | 'completed'
            | 'failed'
            | 'partial_success'
            | 'interrupted';
          config?: Json;
          progress?: Json;
          errors?: Json[];
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'generation_jobs_seed_prompt_id_fkey';
            columns: ['seed_prompt_id'];
            isOneToOne: false;
            referencedRelation: 'seed_prompts';
            referencedColumns: ['id'];
          },
        ];
      };
      llm_provider_configs: {
        Row: {
          id: string;
          user_id: string;
          provider: 'openai' | 'anthropic' | 'gemini';
          api_key_encrypted: string;
          model: string;
          system_prompt_template: string;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: 'openai' | 'anthropic' | 'gemini';
          api_key_encrypted: string;
          model: string;
          system_prompt_template?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: 'openai' | 'anthropic' | 'gemini';
          api_key_encrypted?: string;
          model?: string;
          system_prompt_template?: string;
          enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      job_status:
        | 'pending'
        | 'running'
        | 'completed'
        | 'failed'
        | 'partial_success'
        | 'interrupted';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema['Tables'] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

// Convenience type aliases
export type SeedPrompt = Database['public']['Tables']['seed_prompts']['Row'];
export type GeneratedVariation = Database['public']['Tables']['generated_variations']['Row'];
export type MutatedVariation = Database['public']['Tables']['mutated_variations']['Row'];
export type GenerationJob = Database['public']['Tables']['generation_jobs']['Row'];

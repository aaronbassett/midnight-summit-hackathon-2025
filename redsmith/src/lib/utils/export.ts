import type { Database } from '../supabase/types';

type SeedPrompt = Database['public']['Tables']['seed_prompts']['Row'];
type GeneratedVariation = Database['public']['Tables']['generated_variations']['Row'];
type MutatedVariation = Database['public']['Tables']['mutated_variations']['Row'];

interface SeedPromptWithVariations extends SeedPrompt {
  variations?: GeneratedVariation[];
  mutations?: MutatedVariation[];
}

/**
 * Download a file to the user's computer
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert data to CSV format
 */
function convertToCSV(headers: string[], rows: string[][]): string {
  const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ];

  return csvRows.join('\n');
}

/**
 * Export seed prompts to CSV
 */
export function exportSeedPromptsToCSV(prompts: SeedPrompt[], includeDeleted = false) {
  const filteredPrompts = includeDeleted ? prompts : prompts.filter((p) => !p.deleted_at);

  const headers = [
    'ID',
    'Title',
    'Description',
    'Prompt Text',
    'Type',
    'Goal',
    'Attack Vector',
    'Obfuscation Level',
    'Requires Tool',
    'Created At',
    'Updated At',
    'Deleted At',
  ];

  const rows = filteredPrompts.map((prompt) => [
    prompt.id,
    prompt.title,
    prompt.description,
    prompt.prompt_text,
    prompt.type,
    prompt.goal,
    prompt.attack_vector,
    prompt.obfuscation_level,
    prompt.requires_tool ? 'Yes' : 'No',
    new Date(prompt.created_at).toISOString(),
    new Date(prompt.updated_at).toISOString(),
    prompt.deleted_at ? new Date(prompt.deleted_at).toISOString() : '',
  ]);

  const csv = convertToCSV(headers, rows);
  const filename = `seed-prompts-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export variations to CSV
 */
export function exportVariationsToCSV(variations: GeneratedVariation[]) {
  const filteredVariations = variations.filter((v) => !v.deleted_at);

  const headers = [
    'ID',
    'Seed Prompt ID',
    'Provider',
    'Model',
    'Generated Text',
    'Type',
    'Goal',
    'Attack Vector',
    'Obfuscation Level',
    'Requires Tool',
    'Created At',
  ];

  const rows = filteredVariations.map((variation) => [
    variation.id,
    variation.seed_prompt_id,
    variation.provider,
    variation.model,
    variation.prompt_text,
    variation.type,
    variation.goal,
    variation.attack_vector,
    variation.obfuscation_level,
    variation.requires_tool ? 'Yes' : 'No',
    new Date(variation.created_at).toISOString(),
  ]);

  const csv = convertToCSV(headers, rows);
  const filename = `variations-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export mutations to CSV
 */
export function exportMutationsToCSV(mutations: MutatedVariation[]) {
  const filteredMutations = mutations.filter((m) => !m.deleted_at);

  const headers = ['ID', 'Variation ID', 'Mutated Text', 'Mutations Applied', 'Created At'];

  const rows = filteredMutations.map((mutation) => [
    mutation.id,
    mutation.variation_id,
    mutation.prompt_text,
    mutation.mutations_applied.join(', '),
    new Date(mutation.created_at).toISOString(),
  ]);

  const csv = convertToCSV(headers, rows);
  const filename = `mutations-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export complete dataset (prompts with variations and mutations) to CSV
 */
export function exportCompleteDatasetToCSV(prompts: SeedPromptWithVariations[]) {
  const headers = [
    'Seed ID',
    'Seed Title',
    'Seed Description',
    'Seed Text',
    'Type',
    'Goal',
    'Attack Vector',
    'Obfuscation Level',
    'Requires Tool',
    'Item Type', // "Seed", "Variation", or "Mutation"
    'Provider',
    'Model',
    'Generated/Mutated Text',
    'Mutations Applied',
    'Created At',
  ];

  const rows: string[][] = [];

  prompts.forEach((prompt) => {
    // Add seed prompt row
    rows.push([
      prompt.id,
      prompt.title,
      prompt.description,
      prompt.prompt_text,
      prompt.type,
      prompt.goal,
      prompt.attack_vector,
      prompt.obfuscation_level,
      prompt.requires_tool ? 'Yes' : 'No',
      'Seed',
      '',
      '',
      '',
      '',
      new Date(prompt.created_at).toISOString(),
    ]);

    // Add variation rows
    prompt.variations?.forEach((variation) => {
      rows.push([
        prompt.id,
        prompt.title,
        prompt.description,
        prompt.prompt_text,
        variation.type,
        variation.goal,
        variation.attack_vector,
        variation.obfuscation_level,
        variation.requires_tool ? 'Yes' : 'No',
        'Variation',
        variation.provider,
        variation.model,
        variation.prompt_text,
        '',
        new Date(variation.created_at).toISOString(),
      ]);
    });

    // Add mutation rows (if available)
    prompt.mutations?.forEach((mutation) => {
      rows.push([
        prompt.id,
        prompt.title,
        prompt.description,
        prompt.prompt_text,
        '',
        '',
        '',
        '',
        '',
        'Mutation',
        '',
        '',
        mutation.prompt_text,
        mutation.mutations_applied.join(', '),
        new Date(mutation.created_at).toISOString(),
      ]);
    });
  });

  const csv = convertToCSV(headers, rows);
  const filename = `complete-dataset-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export seed prompts to JSON
 */
export function exportSeedPromptsToJSON(prompts: SeedPrompt[], includeDeleted = false) {
  const filteredPrompts = includeDeleted ? prompts : prompts.filter((p) => !p.deleted_at);

  const data = {
    exportDate: new Date().toISOString(),
    totalCount: filteredPrompts.length,
    prompts: filteredPrompts,
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `seed-prompts-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename, 'application/json');
}

/**
 * Export complete dataset to JSON (with nested structure)
 */
export function exportCompleteDatasetToJSON(prompts: SeedPromptWithVariations[]) {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    totalSeeds: prompts.length,
    totalVariations: prompts.reduce((sum, p) => sum + (p.variations?.length || 0), 0),
    totalMutations: prompts.reduce((sum, p) => sum + (p.mutations?.length || 0), 0),
    prompts: prompts.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      prompt_text: prompt.prompt_text,
      type: prompt.type,
      goal: prompt.goal,
      attack_vector: prompt.attack_vector,
      obfuscation_level: prompt.obfuscation_level,
      requires_tool: prompt.requires_tool,
      created_at: prompt.created_at,
      updated_at: prompt.updated_at,
      deleted_at: prompt.deleted_at,
      variations:
        prompt.variations?.map((v) => ({
          id: v.id,
          provider: v.provider,
          model: v.model,
          prompt_text: v.prompt_text,
          type: v.type,
          goal: v.goal,
          attack_vector: v.attack_vector,
          obfuscation_level: v.obfuscation_level,
          requires_tool: v.requires_tool,
          created_at: v.created_at,
        })) || [],
      mutations:
        prompt.mutations?.map((m) => ({
          id: m.id,
          variation_id: m.variation_id,
          prompt_text: m.prompt_text,
          mutations_applied: m.mutations_applied,
          created_at: m.created_at,
        })) || [],
    })),
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `complete-dataset-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename, 'application/json');
}

/**
 * Export single seed prompt with all variations and mutations to JSON
 */
export function exportSinglePromptToJSON(prompt: SeedPromptWithVariations) {
  const data = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    prompt: {
      id: prompt.id,
      title: prompt.title,
      description: prompt.description,
      prompt_text: prompt.prompt_text,
      type: prompt.type,
      goal: prompt.goal,
      attack_vector: prompt.attack_vector,
      obfuscation_level: prompt.obfuscation_level,
      requires_tool: prompt.requires_tool,
      created_at: prompt.created_at,
      updated_at: prompt.updated_at,
      variationCount: prompt.variations?.length || 0,
      mutationCount: prompt.mutations?.length || 0,
      variations: prompt.variations || [],
      mutations: prompt.mutations || [],
    },
  };

  const json = JSON.stringify(data, null, 2);
  const filename = `prompt-${prompt.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
  downloadFile(json, filename, 'application/json');
}

/**
 * Export single seed prompt with all variations to CSV
 */
export function exportSinglePromptToCSV(prompt: SeedPromptWithVariations) {
  const headers = [
    'Item Type',
    'ID',
    'Provider',
    'Model',
    'Text',
    'Mutations Applied',
    'Created At',
  ];

  const rows: string[][] = [];

  // Seed row
  rows.push([
    'Seed',
    prompt.id,
    '',
    '',
    prompt.prompt_text,
    '',
    new Date(prompt.created_at).toISOString(),
  ]);

  // Variation rows
  prompt.variations?.forEach((variation) => {
    rows.push([
      'Variation',
      variation.id,
      variation.provider,
      variation.model,
      variation.prompt_text,
      '',
      new Date(variation.created_at).toISOString(),
    ]);
  });

  // Mutation rows
  prompt.mutations?.forEach((mutation) => {
    rows.push([
      'Mutation',
      mutation.id,
      '',
      '',
      mutation.prompt_text,
      mutation.mutations_applied.join(', '),
      new Date(mutation.created_at).toISOString(),
    ]);
  });

  const csv = convertToCSV(headers, rows);
  const filename = `prompt-${prompt.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
  downloadFile(csv, filename, 'text/csv');
}

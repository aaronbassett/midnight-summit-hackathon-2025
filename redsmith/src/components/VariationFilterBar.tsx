import { useState, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { PROVIDER_LABELS, type LLMProvider } from '../lib/llm/types';
import type { Database } from '../lib/supabase/types';

type GeneratedVariation = Database['public']['Tables']['generated_variations']['Row'];

export interface VariationFilters {
  providers: LLMProvider[];
  models: string[];
  status: ('success' | 'failed' | 'refused')[];
  sortBy: 'created_at' | 'provider' | 'model';
  sortOrder: 'asc' | 'desc';
}

interface VariationFilterBarProps {
  variations: GeneratedVariation[];
  filters: VariationFilters;
  onFiltersChange: (filters: VariationFilters) => void;
}

export default function VariationFilterBar({
  variations,
  filters,
  onFiltersChange,
}: VariationFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get unique providers and models from variations
  const availableProviders = useMemo(() => {
    const providers = new Set(variations.map((v) => v.provider as LLMProvider));
    return Array.from(providers);
  }, [variations]);

  const availableModels = useMemo(() => {
    const models = new Set(variations.map((v) => v.model));
    return Array.from(models).sort();
  }, [variations]);

  const toggleProvider = (provider: LLMProvider) => {
    const newProviders = filters.providers.includes(provider)
      ? filters.providers.filter((p) => p !== provider)
      : [...filters.providers, provider];
    onFiltersChange({ ...filters, providers: newProviders });
  };

  const toggleModel = (model: string) => {
    const newModels = filters.models.includes(model)
      ? filters.models.filter((m) => m !== model)
      : [...filters.models, model];
    onFiltersChange({ ...filters, models: newModels });
  };

  const toggleStatus = (status: 'success' | 'failed' | 'refused') => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      providers: [],
      models: [],
      status: [],
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters =
    filters.providers.length > 0 ||
    filters.models.length > 0 ||
    filters.status.length > 0 ||
    filters.sortBy !== 'created_at' ||
    filters.sortOrder !== 'desc';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors"
        >
          <Filter size={18} />
          <span className="font-medium">
            Filters{' '}
            {hasActiveFilters &&
              `(${filters.providers.length + filters.models.length + filters.status.length} active)`}
          </span>
        </button>

        <div className="flex items-center gap-3">
          {/* Sort By */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                sortBy: e.target.value as VariationFilters['sortBy'],
              })
            }
            className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm focus:outline-hidden focus:border-cyan-500 transition-colors"
          >
            <option value="created_at">Date Created</option>
            <option value="provider">Provider</option>
            <option value="model">Model</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() =>
              onFiltersChange({
                ...filters,
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
              })
            }
            className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm hover:bg-gray-800 transition-colors"
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors border border-red-500/20"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-800">
          {/* Provider Filter */}
          {availableProviders.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Providers</label>
              <div className="flex flex-wrap gap-2">
                {availableProviders.map((provider) => (
                  <button
                    key={provider}
                    onClick={() => toggleProvider(provider)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      filters.providers.includes(provider)
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    {PROVIDER_LABELS[provider]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Model Filter */}
          {availableModels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Models</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableModels.map((model) => (
                  <button
                    key={model}
                    onClick={() => toggleModel(model)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      filters.models.includes(model)
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                    }`}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleStatus('success')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  filters.status.includes('success')
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                }`}
              >
                Success
              </button>
              <button
                onClick={() => toggleStatus('failed')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  filters.status.includes('failed')
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                }`}
              >
                Failed
              </button>
              <button
                onClick={() => toggleStatus('refused')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  filters.status.includes('refused')
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                }`}
              >
                Content Policy Refused
              </button>
            </div>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-400">Active:</span>
                {filters.providers.map((provider) => (
                  <span
                    key={provider}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-sm text-xs border border-cyan-500/20"
                  >
                    {PROVIDER_LABELS[provider]}
                    <button
                      onClick={() => toggleProvider(provider)}
                      className="hover:text-cyan-300"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {filters.models.map((model) => (
                  <span
                    key={model}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-sm text-xs border border-cyan-500/20"
                  >
                    {model}
                    <button onClick={() => toggleModel(model)} className="hover:text-cyan-300">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {filters.status.map((status) => (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-sm text-xs border border-cyan-500/20"
                  >
                    {status}
                    <button onClick={() => toggleStatus(status)} className="hover:text-cyan-300">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

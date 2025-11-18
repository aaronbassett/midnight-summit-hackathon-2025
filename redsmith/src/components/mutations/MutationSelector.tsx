import { Check } from 'lucide-react';
import { getMutationDisplayName, type MutationType } from '../../lib/mutations/engine';

const ALL_MUTATIONS: MutationType[] = ['character_substitution', 'encoding_base64', 'encoding_hex'];

interface MutationSelectorProps {
  selected: MutationType[];
  onChange: (mutations: MutationType[]) => void;
  disabled?: boolean;
}

export default function MutationSelector({ selected, onChange, disabled }: MutationSelectorProps) {
  const toggleMutation = (mutation: MutationType) => {
    if (disabled) return;

    if (selected.includes(mutation)) {
      onChange(selected.filter((m) => m !== mutation));
    } else {
      onChange([...selected, mutation]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(ALL_MUTATIONS);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">Select Mutations</h3>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            disabled={disabled}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={clearAll}
            disabled={disabled}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {ALL_MUTATIONS.map((mutation) => {
          const isSelected = selected.includes(mutation);
          return (
            <button
              key={mutation}
              onClick={() => toggleMutation(mutation)}
              disabled={disabled}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-all
                ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div
                className={`
                  flex items-center justify-center w-5 h-5 rounded border transition-all
                  ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600'}
                `}
              >
                {isSelected && <Check size={14} className="text-black" />}
              </div>
              <span className="text-sm font-medium">{getMutationDisplayName(mutation)}</span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {selected.length} mutation{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

import { Check, Copy, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getMutationDisplayName, type MutationType } from '../../lib/mutations/engine';
import type { Database } from '../../lib/supabase/types';

type MutatedVariation = Database['public']['Tables']['mutated_variations']['Row'];

interface MutatedVariationCardProps {
  mutation: MutatedVariation;
  originalText?: string;
  onDelete?: (mutationId: string) => void;
  showComparison?: boolean;
}

export default function MutatedVariationCard({
  mutation,
  originalText,
  onDelete,
  showComparison = false,
}: MutatedVariationCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mutation.prompt_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this mutated variation?')) {
      onDelete(mutation.id);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {mutation.mutations_applied.map((mutationType) => (
            <span
              key={mutationType}
              className="px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-xs font-medium border border-purple-500/20"
            >
              {getMutationDisplayName(mutationType as MutationType)}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Delete mutation"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      {showComparison && originalText ? (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Original */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Original</h4>
            <div className="bg-black border border-gray-800 rounded-lg p-4 h-full">
              <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                {originalText}
              </p>
            </div>
          </div>

          {/* Mutated */}
          <div>
            <h4 className="text-xs font-medium text-purple-400 mb-2">Mutated</h4>
            <div className="bg-black border border-purple-500/20 rounded-lg p-4 h-full">
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {mutation.prompt_text}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Mutated Text Only */
        <div className="bg-black border border-gray-800 rounded-lg p-4 mb-4">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap overflow-hidden">
            {mutation.prompt_text}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Created {new Date(mutation.created_at).toLocaleDateString()}</span>
        <span className="font-mono">{mutation.id.slice(0, 8)}</span>
      </div>
    </div>
  );
}

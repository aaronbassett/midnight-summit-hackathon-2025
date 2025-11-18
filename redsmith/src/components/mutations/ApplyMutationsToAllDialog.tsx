import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import MutationSelector from './MutationSelector';
import { useMutationsStore } from '../../stores/mutationsStore';
import type { MutationType } from '../../lib/mutations/engine';
import { applyMutationsToText } from '../../lib/mutations/engine';
import { toast } from '../../lib/utils/toast';
import type { Database } from '../../lib/supabase/types';

type GeneratedVariation = Database['public']['Tables']['generated_variations']['Row'];

interface ApplyMutationsToAllDialogProps {
  variations: GeneratedVariation[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ApplyMutationsToAllDialog({
  variations,
  onClose,
  onSuccess,
}: ApplyMutationsToAllDialogProps) {
  const [selectedMutations, setSelectedMutations] = useState<MutationType[]>([]);
  const [previewCount, setPreviewCount] = useState(0);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { applyMutations } = useMutationsStore();

  // Calculate preview count when mutations change
  useEffect(() => {
    const calculatePreviewCount = async () => {
      if (selectedMutations.length === 0 || variations.length === 0) {
        setPreviewCount(0);
        return;
      }

      // Calculate total mutations that will be created
      // For each variation, we'll get multiple mutated versions based on the selected mutations
      const sampleVariation = variations[0];
      const sampleResults = await applyMutationsToText(
        sampleVariation.prompt_text || '',
        selectedMutations
      );

      // Total mutations = number of variations × number of mutation combinations per variation
      setPreviewCount(variations.length * sampleResults.length);
    };

    calculatePreviewCount();
  }, [selectedMutations, variations]);

  const handleApply = async () => {
    if (selectedMutations.length === 0) {
      toast.error('Please select at least one mutation');
      return;
    }

    if (variations.length === 0) {
      toast.error('No variations to mutate');
      return;
    }

    setApplying(true);
    setProgress({ current: 0, total: variations.length });

    let successCount = 0;
    let errorCount = 0;

    // Apply mutations to each variation
    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i];
      setProgress({ current: i + 1, total: variations.length });

      const { error } = await applyMutations(variation.id, selectedMutations);

      if (error) {
        errorCount++;
      } else {
        successCount++;
      }
    }

    setApplying(false);

    // Show results
    if (errorCount === 0) {
      toast.success(
        `Successfully applied mutations to all ${successCount} variation${successCount !== 1 ? 's' : ''}`
      );
    } else if (successCount > 0) {
      toast.warning(
        `Applied mutations to ${successCount} variation${successCount !== 1 ? 's' : ''}. ${errorCount} failed.`
      );
    } else {
      toast.error('Failed to apply mutations to any variations');
    }

    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Apply Mutations to All</h2>
          </div>
          <button
            onClick={onClose}
            disabled={applying}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {applying ? (
            <div className="space-y-6">
              <div className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Loader2 className="animate-spin text-purple-400" size={24} />
                  <p className="text-white font-medium">Applying mutations...</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Progress</span>
                    <span>
                      {progress.current} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mutation Selector */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3">Select Mutations</h3>
                <MutationSelector
                  selected={selectedMutations}
                  onChange={setSelectedMutations}
                  disabled={applying}
                />
              </div>

              {/* Info */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Variations to mutate:</span>
                    <span className="font-semibold text-white">{variations.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Mutations selected:</span>
                    <span className="font-semibold text-white">{selectedMutations.length}</span>
                  </div>
                  {previewCount > 0 && (
                    <div className="flex justify-between text-purple-400 pt-2 border-t border-gray-700">
                      <span>New mutations to create:</span>
                      <span className="font-semibold">{previewCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedMutations.length === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-yellow-400 text-sm">
                    Please select at least one mutation to continue
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <p className="text-sm text-gray-400">
            {!applying && previewCount > 0 && (
              <>
                This will create <span className="text-white font-semibold">{previewCount}</span>{' '}
                new mutated variation{previewCount !== 1 ? 's' : ''}
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={applying}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={applying || selectedMutations.length === 0}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Apply to All
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

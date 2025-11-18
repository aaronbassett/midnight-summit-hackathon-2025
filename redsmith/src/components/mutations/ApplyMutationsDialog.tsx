import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import MutationSelector from './MutationSelector';
import { useMutationsStore } from '../../stores/mutationsStore';
import type { MutationType } from '../../lib/mutations/engine';
import { applyMutationsToText } from '../../lib/mutations/engine';
import { toast } from '../../lib/utils/toast';

interface ApplyMutationsDialogProps {
  variationId: string;
  variationText: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ApplyMutationsDialog({
  variationId,
  variationText,
  onClose,
  onSuccess,
}: ApplyMutationsDialogProps) {
  const [selectedMutations, setSelectedMutations] = useState<MutationType[]>([]);
  const [preview, setPreview] = useState<Array<{ mutated: string; applied: MutationType[] }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { applyMutations, loading } = useMutationsStore();

  // Generate preview when mutations change
  useEffect(() => {
    const generatePreview = async () => {
      if (selectedMutations.length === 0) {
        setPreview([]);
        return;
      }

      const results = await applyMutationsToText(variationText, selectedMutations);
      setPreview(results);
    };

    generatePreview();
  }, [selectedMutations, variationText]);

  const handleApply = async () => {
    if (selectedMutations.length === 0) {
      toast.error('Please select at least one mutation');
      return;
    }

    const { error } = await applyMutations(variationId, selectedMutations);

    if (error) {
      toast.error('Failed to apply mutations');
      return;
    }

    toast.success(`Successfully applied ${selectedMutations.length} mutation(s)`);
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Apply Mutations</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Mutation Selector */}
            <div>
              <MutationSelector
                selected={selectedMutations}
                onChange={setSelectedMutations}
                disabled={loading}
              />

              <div className="mt-6 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Original Text</h4>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {variationText}
                </p>
              </div>
            </div>

            {/* Right: Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Preview</h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              </div>

              {selectedMutations.length === 0 ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-500 text-sm">Select mutations to see preview</p>
                </div>
              ) : showPreview ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {preview.map((result, index) => (
                    <div
                      key={index}
                      className="bg-gray-800/50 border border-purple-500/20 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {result.applied.map((m, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded-sm text-xs"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                        {result.mutated}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-400 text-sm mb-2">
                    {preview.length} variation{preview.length !== 1 ? 's' : ''} will be created
                  </p>
                  <p className="text-gray-500 text-xs">Click "Show Preview" to see them</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <p className="text-sm text-gray-400">
            {preview.length > 0 && (
              <>
                This will create <span className="text-white font-semibold">{preview.length}</span>{' '}
                new mutated variation{preview.length !== 1 ? 's' : ''}
              </>
            )}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={loading || selectedMutations.length === 0}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Apply Mutations
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

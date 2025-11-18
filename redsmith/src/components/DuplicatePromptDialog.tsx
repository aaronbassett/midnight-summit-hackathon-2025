import { useState } from 'react';
import { Copy, X } from 'lucide-react';
import type { DuplicateOptions } from '../stores/seedPromptsStore';

interface DuplicatePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: DuplicateOptions) => void;
  promptTitle: string;
  hasVariations: boolean;
  hasMutations: boolean;
}

export default function DuplicatePromptDialog({
  isOpen,
  onClose,
  onConfirm,
  promptTitle,
  hasVariations,
  hasMutations,
}: DuplicatePromptDialogProps) {
  const [options, setOptions] = useState<DuplicateOptions>({
    includeVariations: false,
    includeMutations: false,
    nameSuffix: ' (Copy)',
  });

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(options);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Copy className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Duplicate Prompt</h2>
              <p className="text-gray-400 text-sm">Configure duplication options</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="bg-black border border-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Original:</p>
            <p className="text-white font-medium">{promptTitle}</p>
            <p className="text-gray-400 text-xs mt-2">Will become:</p>
            <p className="text-cyan-400 font-medium">
              {promptTitle}
              {options.nameSuffix}
            </p>
          </div>

          {/* Name suffix */}
          <div>
            <label htmlFor="suffix" className="block text-sm font-medium text-gray-300 mb-2">
              Name Suffix
            </label>
            <input
              id="suffix"
              type="text"
              value={options.nameSuffix}
              onChange={(e) => setOptions({ ...options, nameSuffix: e.target.value })}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
              placeholder=" (Copy)"
            />
            <p className="text-gray-500 text-xs mt-1">
              This will be appended to the title of the duplicated prompt
            </p>
          </div>

          {/* Include variations */}
          {hasVariations && (
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeVariations}
                  onChange={(e) => setOptions({ ...options, includeVariations: e.target.checked })}
                  className="w-5 h-5 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-gray-300 font-medium">Include Variations</span>
                  <p className="text-gray-500 text-sm">
                    Duplicate all generated variations along with the seed prompt
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Include mutations */}
          {hasMutations && options.includeVariations && (
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeMutations}
                  onChange={(e) => setOptions({ ...options, includeMutations: e.target.checked })}
                  className="w-5 h-5 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-gray-300 font-medium">Include Mutations</span>
                  <p className="text-gray-500 text-sm">
                    Duplicate all mutations applied to variations (requires variations)
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Warning if no variations */}
          {!hasVariations && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                This prompt has no variations yet. Only the seed prompt will be duplicated.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-400 font-semibold hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Copy size={20} />
            Duplicate Prompt
          </button>
        </div>
      </div>
    </div>
  );
}

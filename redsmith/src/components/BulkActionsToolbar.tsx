import { X, Trash2, Copy, Zap } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onBulkDelete: () => void;
  onBulkDuplicate: () => void;
  onBulkGenerateVariations: () => void;
}

export default function BulkActionsToolbar({
  selectedCount,
  onDeselectAll,
  onBulkDelete,
  onBulkDuplicate,
  onBulkGenerateVariations,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4">
        <div className="flex items-center gap-6">
          {/* Selection Count */}
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{selectedCount}</span>
            <span className="text-gray-400 text-sm">
              {selectedCount === 1 ? 'prompt' : 'prompts'} selected
            </span>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-700" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBulkDuplicate}
              className="px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-colors border border-cyan-500/20 flex items-center gap-2 text-sm"
              title="Duplicate selected"
            >
              <Copy size={16} />
              Duplicate
            </button>

            <button
              onClick={onBulkGenerateVariations}
              className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/20 flex items-center gap-2 text-sm"
              title="Generate variations for selected"
            >
              <Zap size={16} />
              Generate
            </button>

            <button
              onClick={onBulkDelete}
              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center gap-2 text-sm"
              title="Delete selected"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-700" />

          {/* Close */}
          <button
            onClick={onDeselectAll}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Deselect all"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

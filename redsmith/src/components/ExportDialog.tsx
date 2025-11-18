import { useState, useEffect } from 'react';
import { X, Download, FileJson, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { toast } from '../lib/utils/toast';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportMode = 'full' | 'training';
type ExportOption = 'seed_prompts' | 'variations' | 'mutations';
type ExportStep = 'mode_selection' | 'configure' | 'preview' | 'exporting';

interface ExportStats {
  totalPrompts: number;
  seedPrompts: number;
  variations: number;
  mutations: number;
  typeBreakdown: {
    wallet_attack: number;
    benign: number;
    ambiguous: number;
  };
}

interface BatchProgress {
  batchNumber: number;
  totalBatches: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  error?: string;
}

const BATCH_SIZE = 500;

export default function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [selectedOptions, setSelectedOptions] = useState<Set<ExportOption>>(
    new Set(['seed_prompts'])
  );
  const [currentStep, setCurrentStep] = useState<ExportStep>('mode_selection');
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [batches, setBatches] = useState<BatchProgress[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setExportMode('full');
      setSelectedOptions(new Set(['seed_prompts']));
      setCurrentStep('mode_selection');
      setStats(null);
      setBatches([]);
    }
  }, [isOpen]);

  const handleToggleOption = (option: ExportOption) => {
    const newOptions = new Set(selectedOptions);

    if (newOptions.has(option)) {
      newOptions.delete(option);
      // If variations is deselected, also deselect mutations
      if (option === 'variations' && newOptions.has('mutations')) {
        newOptions.delete('mutations');
      }
    } else {
      newOptions.add(option);
    }

    setSelectedOptions(newOptions);
  };

  const fetchExportStats = async () => {
    setLoadingStats(true);

    try {
      let seedPromptsCount = 0;
      let variationsCount = 0;
      let mutationsCount = 0;
      const typeBreakdown = {
        wallet_attack: 0,
        benign: 0,
        ambiguous: 0,
      };

      // Fetch seed prompts count if selected
      if (selectedOptions.has('seed_prompts')) {
        const { data: seedPrompts, error: seedError } = await supabase
          .from('seed_prompts')
          .select('id, type')
          .is('deleted_at', null);

        if (seedError) throw seedError;

        seedPromptsCount = seedPrompts?.length || 0;

        // Calculate type breakdown
        typeBreakdown.wallet_attack =
          seedPrompts?.filter((p) => p.type === 'wallet_attack').length || 0;
        typeBreakdown.benign = seedPrompts?.filter((p) => p.type === 'benign').length || 0;
        typeBreakdown.ambiguous = seedPrompts?.filter((p) => p.type === 'ambiguous').length || 0;
      }

      // Fetch variations count if selected
      if (selectedOptions.has('variations')) {
        const { count: varCount, error: varError } = await supabase
          .from('generated_variations')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null);

        if (varError) throw varError;
        variationsCount = varCount || 0;

        // Fetch mutations count if selected
        if (selectedOptions.has('mutations')) {
          const { count: mutCount, error: mutError } = await supabase
            .from('mutated_variations')
            .select('*', { count: 'exact', head: true })
            .is('deleted_at', null);

          if (mutError) throw mutError;
          mutationsCount = mutCount || 0;
        }
      }

      const totalItems = seedPromptsCount + variationsCount + mutationsCount;

      setStats({
        totalPrompts: totalItems,
        seedPrompts: seedPromptsCount,
        variations: variationsCount,
        mutations: mutationsCount,
        typeBreakdown,
      });

      setCurrentStep('preview');
    } catch (error) {
      console.error('Error fetching export stats:', error);
      toast.error('Failed to calculate export statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleModeSelect = (mode: ExportMode) => {
    setExportMode(mode);
    if (mode === 'training') {
      // Auto-select variations and mutations for training data
      setSelectedOptions(new Set(['variations', 'mutations']));
    } else {
      // Reset to default for full export
      setSelectedOptions(new Set(['seed_prompts']));
    }
    setCurrentStep('configure');
  };

  const handlePrepareExport = async () => {
    if (selectedOptions.size === 0) {
      toast.error('Please select at least one export option');
      return;
    }

    await fetchExportStats();
  };

  const handleStartExport = async () => {
    if (!stats) return;

    if (exportMode === 'training') {
      await processTrainingExport();
    } else {
      await processFullExport();
    }
  };

  const processTrainingExport = async () => {
    setCurrentStep('exporting');
    setBatches([
      { batchNumber: 1, totalBatches: 3, status: 'pending' },
      { batchNumber: 2, totalBatches: 3, status: 'pending' },
      { batchNumber: 3, totalBatches: 3, status: 'pending' },
    ]);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL not configured');
      }

      // Call training export edge function with streaming
      const datasets = ['train', 'validation', 'test'];

      for (let i = 0; i < datasets.length; i++) {
        const dataset = datasets[i];

        // Update batch status to downloading
        setBatches((prev) =>
          prev.map((b, idx) => (idx === i ? { ...b, status: 'downloading' } : b))
        );

        const response = await fetch(`${supabaseUrl}/functions/v1/export-training-data`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dataset }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Export failed');
        }

        // Get the blob from the response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dataset}.jsonl`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Update batch status to completed
        setBatches((prev) => prev.map((b, idx) => (idx === i ? { ...b, status: 'completed' } : b)));
      }

      toast.success('Training data export completed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error exporting training data:', error);
      toast.error(`Failed to export training data: ${errorMessage}`);
    }
  };

  const processFullExport = async () => {
    if (!stats) return;

    // Calculate number of batches based on total items
    const numBatches = Math.ceil(stats.totalPrompts / BATCH_SIZE);

    // Initialize batch progress
    const initialBatches: BatchProgress[] = Array.from({ length: numBatches }, (_, i) => ({
      batchNumber: i + 1,
      totalBatches: numBatches,
      status: 'pending',
    }));

    setBatches(initialBatches);
    setCurrentStep('exporting');

    // Process batches sequentially
    for (let i = 0; i < numBatches; i++) {
      await processBatch(i, numBatches);
    }

    toast.success('Export completed successfully!');
  };

  const processBatch = async (batchIndex: number, totalBatches: number) => {
    // Update batch status to downloading
    setBatches((prev) =>
      prev.map((b, i) => (i === batchIndex ? { ...b, status: 'downloading' } : b))
    );

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL not configured');
      }

      // Call export edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/export-prompts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          options: Array.from(selectedOptions),
          batchIndex,
          batchSize: BATCH_SIZE,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Export failed');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-export-batch-${batchIndex + 1}-of-${totalBatches}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Update batch status to completed
      setBatches((prev) =>
        prev.map((b, i) => (i === batchIndex ? { ...b, status: 'completed' } : b))
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error processing batch:', error);

      // Update batch status to error
      setBatches((prev) =>
        prev.map((b, i) => (i === batchIndex ? { ...b, status: 'error', error: errorMessage } : b))
      );

      toast.error(`Failed to export batch ${batchIndex + 1}: ${errorMessage}`);
    }
  };

  const handleBackToConfig = () => {
    setCurrentStep('configure');
    setStats(null);
  };

  const handleBackToModeSelection = () => {
    setCurrentStep('mode_selection');
  };

  const handleClose = () => {
    if (currentStep === 'exporting') {
      if (
        window.confirm(
          'Export is in progress. Are you sure you want to close? Downloads in progress will continue.'
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getBatchStatusIcon = (status: BatchProgress['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
      case 'downloading':
        return <Loader2 size={20} className="text-cyan-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 size={20} className="text-green-400" />;
      case 'error':
        return <X size={20} className="text-red-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <FileJson className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Export All Data</h2>
              <p className="text-gray-400 text-sm">Export your complete dataset to JSON format</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'mode_selection' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Choose Export Mode</h3>
                <div className="space-y-3">
                  {/* Full Export */}
                  <button
                    onClick={() => handleModeSelect('full')}
                    className="w-full text-left p-6 bg-black border-2 border-gray-700 rounded-lg hover:border-cyan-500 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                        <FileJson className="text-cyan-400" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold text-lg mb-2">Full Export</div>
                        <div className="text-gray-400 text-sm">
                          Export complete dataset with all metadata, structured by seed prompts,
                          variations, and mutations. Ideal for archival and comprehensive analysis.
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Training Data Only */}
                  <button
                    onClick={() => handleModeSelect('training')}
                    className="w-full text-left p-6 bg-black border-2 border-gray-700 rounded-lg hover:border-purple-500 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
                        <Download className="text-purple-400" size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold text-lg mb-2">
                          Training Data Only
                        </div>
                        <div className="text-gray-400 text-sm">
                          Export variations and mutations in JSONL format optimized for ML training.
                          Automatically splits into train/validation/test sets with balanced
                          sampling.
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'configure' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">
                  What would you like to export?
                </h3>
                <div className="space-y-3">
                  {/* Seed Prompts */}
                  <label className="flex items-start gap-3 p-4 bg-black border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedOptions.has('seed_prompts')}
                      onChange={() => handleToggleOption('seed_prompts')}
                      className="w-5 h-5 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">Seed Prompts</div>
                      <div className="text-gray-400 text-sm">
                        Export the original seed prompt data
                      </div>
                    </div>
                  </label>

                  {/* Variations */}
                  <label className="flex items-start gap-3 p-4 bg-black border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedOptions.has('variations')}
                      onChange={() => handleToggleOption('variations')}
                      className="w-5 h-5 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">Generated Variations</div>
                      <div className="text-gray-400 text-sm">
                        Export all LLM-generated variations
                      </div>
                    </div>
                  </label>

                  {/* Mutations */}
                  <label
                    className={`flex items-start gap-3 p-4 bg-black border border-gray-700 rounded-lg cursor-pointer transition-colors ${
                      selectedOptions.has('variations')
                        ? 'hover:border-gray-600'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedOptions.has('mutations')}
                      onChange={() => handleToggleOption('mutations')}
                      disabled={!selectedOptions.has('variations')}
                      className="w-5 h-5 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">Mutated Variations</div>
                      <div className="text-gray-400 text-sm">
                        Export all mutated variations (requires Variations to be selected)
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'preview' && stats && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Export Summary</h3>

                {/* Total Items */}
                <div className="bg-black border border-gray-700 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400 mb-2">
                      {stats.totalPrompts.toLocaleString()}
                    </div>
                    <div className="text-gray-400">Total Items to Export</div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-black border border-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {stats.seedPrompts.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Seed Prompts</div>
                  </div>
                  <div className="bg-black border border-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {stats.variations.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Variations</div>
                  </div>
                  <div className="bg-black border border-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {stats.mutations.toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm">Mutations</div>
                  </div>
                </div>

                {/* Type Breakdown */}
                <div className="bg-black border border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Seed Prompt Types</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Wallet Attack</span>
                      <span className="text-red-400 font-medium">
                        {stats.typeBreakdown.wallet_attack}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Benign</span>
                      <span className="text-green-400 font-medium">
                        {stats.typeBreakdown.benign}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Ambiguous</span>
                      <span className="text-yellow-400 font-medium">
                        {stats.typeBreakdown.ambiguous}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Batch Info */}
                {stats.totalPrompts > BATCH_SIZE && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mt-4">
                    <div className="text-cyan-400 text-sm">
                      <strong>Note:</strong> Due to the size of your export (
                      {stats.totalPrompts.toLocaleString()} items), it will be split into{' '}
                      {Math.ceil(stats.totalPrompts / BATCH_SIZE)} batches of up to {BATCH_SIZE}{' '}
                      items each.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'exporting' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Export Progress</h3>

                {/* Overall Progress */}
                <div className="bg-black border border-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Overall Progress</span>
                    <span className="text-white font-medium">
                      {batches.filter((b) => b.status === 'completed').length} / {batches.length}{' '}
                      batches
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (batches.filter((b) => b.status === 'completed').length /
                            batches.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Batch List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {batches.map((batch, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-black border border-gray-700 rounded-lg"
                    >
                      <div className="flex-shrink-0">{getBatchStatusIcon(batch.status)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium">
                          Batch {batch.batchNumber} of {batch.totalBatches}
                        </div>
                        {batch.error && (
                          <div className="text-red-400 text-xs mt-1">{batch.error}</div>
                        )}
                        {batch.status === 'downloading' && (
                          <div className="text-cyan-400 text-xs mt-1">Downloading...</div>
                        )}
                        {batch.status === 'completed' && (
                          <div className="text-green-400 text-xs mt-1">Download completed</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          {currentStep === 'mode_selection' && (
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          )}

          {currentStep === 'configure' && (
            <>
              <button
                onClick={handleBackToModeSelection}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <button
                onClick={handlePrepareExport}
                disabled={selectedOptions.size === 0 || loadingStats}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingStats ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Loading...
                  </>
                ) : (
                  <>
                    <FileJson size={20} />
                    Prepare Export
                  </>
                )}
              </button>
            </>
          )}

          {currentStep === 'preview' && (
            <>
              <button
                onClick={handleBackToConfig}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={20} />
                Back
              </button>
              <button
                onClick={handleStartExport}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
              >
                <Download size={20} />
                Start Export
              </button>
            </>
          )}

          {currentStep === 'exporting' && (
            <button
              onClick={handleClose}
              disabled={batches.some((b) => b.status === 'downloading')}
              className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batches.some((b) => b.status === 'downloading') ? 'Exporting...' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

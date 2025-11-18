import { useState, useEffect } from 'react';
import { X, Zap, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useGenerationStore } from '../stores/generationStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useSeedPromptsStore } from '../stores/seedPromptsStore';
import { PROVIDER_LABELS, type LLMProvider } from '../lib/llm/types';
import { toast } from '../lib/utils/toast';

interface BulkGenerateVariationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPromptIds: string[];
  promptCount: number;
}

type PromptStatus = 'pending' | 'in_progress' | 'success' | 'error';

interface PromptProgress {
  id: string;
  title: string;
  status: PromptStatus;
  errorMessage?: string;
  jobId?: string;
}

export default function BulkGenerateVariationsDialog({
  isOpen,
  onClose,
  selectedPromptIds,
  promptCount,
}: BulkGenerateVariationsDialogProps) {
  const { startGeneration, isGenerating } = useGenerationStore();
  const { configs, fetchConfigs } = useSettingsStore();
  const { prompts } = useSeedPromptsStore();
  const [selectedProviders, setSelectedProviders] = useState<LLMProvider[]>([]);
  const [countPerProvider, setCountPerProvider] = useState(10);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [progressList, setProgressList] = useState<PromptProgress[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Initialize progress list when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    if (selectedPromptIds.length > 0) {
      const initialProgress = selectedPromptIds.map((id) => {
        const prompt = prompts.find((p) => p.id === id);
        return {
          id,
          title: prompt?.title || 'Unknown Prompt',
          status: 'pending' as PromptStatus,
        };
      });
      setProgressList(initialProgress);
    } else {
      setProgressList([]);
    }
    setIsRunning(false);
    setIsComplete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const enabledProviders = configs.filter((c) => c.enabled);

  const handleToggleProvider = (provider: LLMProvider) => {
    if (selectedProviders.includes(provider)) {
      setSelectedProviders(selectedProviders.filter((p) => p !== provider));
    } else {
      setSelectedProviders([...selectedProviders, provider]);
    }
  };

  const handleStartGeneration = async () => {
    if (selectedProviders.length === 0) {
      toast.error('Please select at least one provider');
      return;
    }

    if (countPerProvider < 1 || countPerProvider > 100) {
      toast.error('Count per provider must be between 1 and 100');
      return;
    }

    setIsRunning(true);
    let successCount = 0;
    let failCount = 0;

    // Start generation for each selected prompt
    for (let i = 0; i < selectedPromptIds.length; i++) {
      const promptId = selectedPromptIds[i];

      // Update status to in_progress
      setProgressList((prev) =>
        prev.map((p) => (p.id === promptId ? { ...p, status: 'in_progress' } : p))
      );

      const { jobId, error } = await startGeneration(promptId, {
        providers: selectedProviders,
        count_per_provider: countPerProvider,
        system_prompt: systemPrompt || undefined,
      });

      // Update status based on result
      if (error) {
        failCount++;
        setProgressList((prev) =>
          prev.map((p) =>
            p.id === promptId ? { ...p, status: 'error', errorMessage: error.message } : p
          )
        );
      } else if (jobId) {
        successCount++;
        setProgressList((prev) =>
          prev.map((p) => (p.id === promptId ? { ...p, status: 'success', jobId } : p))
        );
      }
    }

    setIsRunning(false);
    setIsComplete(true);

    // Show summary toast
    if (failCount > 0) {
      toast.error(`Started generation for ${successCount} prompt(s), ${failCount} failed`);
    } else {
      toast.success(`Started generation for ${successCount} prompt(s)!`);
    }
  };

  const handleClose = () => {
    if (isRunning) {
      if (
        window.confirm(
          'Generation is in progress. Are you sure you want to close? This will not stop the generation jobs.'
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const getStatusIcon = (status: PromptStatus) => {
    switch (status) {
      case 'pending':
        return <Clock size={18} className="text-gray-400" />;
      case 'in_progress':
        return <Loader2 size={18} className="text-cyan-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 size={18} className="text-green-400" />;
      case 'error':
        return <XCircle size={18} className="text-red-400" />;
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
              <Zap className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Bulk Generate Variations</h2>
              <p className="text-gray-400 text-sm">
                Generate variations for {promptCount} selected prompt{promptCount === 1 ? '' : 's'}
              </p>
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
          {enabledProviders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No LLM providers are enabled</p>
              <p className="text-gray-500 text-sm">
                Please enable at least one provider in Settings to generate variations
              </p>
            </div>
          ) : isRunning || isComplete ? (
            <div className="space-y-4">
              {/* Progress Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">
                  {isRunning ? 'Generating...' : 'Generation Complete'}
                </h3>
                <span className="text-sm text-gray-400">
                  {progressList.filter((p) => p.status === 'success').length} /{' '}
                  {progressList.length} successful
                </span>
              </div>

              {/* Progress List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {progressList.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="flex items-start gap-3 p-3 bg-black border border-gray-700 rounded-lg"
                  >
                    <div className="flex-shrink-0 mt-0.5">{getStatusIcon(prompt.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{prompt.title}</div>
                      {prompt.errorMessage && (
                        <div className="text-red-400 text-xs mt-1">{prompt.errorMessage}</div>
                      )}
                      {prompt.status === 'success' && (
                        <div className="text-green-400 text-xs mt-1">
                          Generation started successfully
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Select Providers
                </label>
                <div className="space-y-2">
                  {enabledProviders.map((config) => (
                    <label
                      key={config.provider}
                      className="flex items-center gap-3 p-3 bg-black border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(config.provider)}
                        onChange={() => handleToggleProvider(config.provider)}
                        className="w-5 h-5 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {PROVIDER_LABELS[config.provider]}
                        </div>
                        <div className="text-gray-500 text-xs">{config.model}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Count Per Provider */}
              <div>
                <label htmlFor="count" className="block text-sm font-medium text-gray-300 mb-2">
                  Variations per Provider (per prompt)
                </label>
                <input
                  id="count"
                  type="number"
                  min={1}
                  max={100}
                  value={countPerProvider}
                  onChange={(e) => setCountPerProvider(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors"
                />
                <p className="text-gray-500 text-xs mt-2">
                  Total variations: {promptCount} prompts × {selectedProviders.length} provider
                  {selectedProviders.length === 1 ? '' : 's'} × {countPerProvider} ={' '}
                  {promptCount * selectedProviders.length * countPerProvider}
                </p>
              </div>

              {/* System Prompt (Optional) */}
              <div>
                <label
                  htmlFor="system-prompt"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Custom System Prompt (Optional)
                </label>
                <textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Leave empty to use default..."
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-cyan-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {enabledProviders.length > 0 && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
            {isRunning || isComplete ? (
              <button
                onClick={handleClose}
                disabled={isRunning}
                className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? 'Generating...' : 'Close'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartGeneration}
                  disabled={isGenerating || selectedProviders.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Start Generation
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

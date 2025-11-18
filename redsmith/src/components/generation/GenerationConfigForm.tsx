import { useState, useEffect } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { useGenerationStore } from '../../stores/generationStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { PROVIDER_LABELS, type LLMProvider } from '../../lib/llm/types';
import { toast } from '../../lib/utils/toast';

interface GenerationConfigFormProps {
  seedPromptId: string;
  onJobStarted?: (jobId: string) => void;
}

export default function GenerationConfigForm({
  seedPromptId,
  onJobStarted,
}: GenerationConfigFormProps) {
  const { startGeneration, isGenerating } = useGenerationStore();
  const { configs, fetchConfigs } = useSettingsStore();
  const [selectedProviders, setSelectedProviders] = useState<LLMProvider[]>([]);
  const [countPerProvider, setCountPerProvider] = useState(10);
  const [systemPrompt, setSystemPrompt] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

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

    const { jobId, error } = await startGeneration(seedPromptId, {
      providers: selectedProviders,
      count_per_provider: countPerProvider,
      system_prompt: systemPrompt || undefined,
    });

    if (error) {
      toast.error(`Failed to start generation: ${error.message}`);
    } else if (jobId) {
      toast.success('Generation started!');
      onJobStarted?.(jobId);
    }
  };

  if (enabledProviders.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No LLM providers are enabled</p>
          <p className="text-gray-500 text-sm">
            Please enable at least one provider in Settings to generate variations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
          <Zap className="text-cyan-400" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Generate Variations</h3>
          <p className="text-gray-400 text-sm">Configure and start LLM generation</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Select Providers</label>
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
                  <div className="text-white font-medium">{PROVIDER_LABELS[config.provider]}</div>
                  <div className="text-gray-500 text-xs">{config.model}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Count Per Provider */}
        <div>
          <label htmlFor="count" className="block text-sm font-medium text-gray-300 mb-2">
            Variations per Provider
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
            Total variations: {selectedProviders.length * countPerProvider}
          </p>
        </div>

        {/* System Prompt (Optional) */}
        <div>
          <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-300 mb-2">
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

        {/* Start Button */}
        <button
          onClick={handleStartGeneration}
          disabled={isGenerating || selectedProviders.length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </div>
  );
}

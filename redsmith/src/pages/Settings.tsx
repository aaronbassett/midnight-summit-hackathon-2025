import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Key, Zap, AlertCircle, CheckCircle, XCircle, Loader2, Sparkles } from 'lucide-react';
import { useSettingsStore } from '../stores/settingsStore';
import { PROVIDER_LABELS, type LLMProvider } from '../lib/llm/types';
import { toast } from '../lib/utils/toast';
import SettingsSkeleton from '../components/skeletons/SettingsSkeleton';
import { ROUTES } from '../types/routes';

interface TestResult {
  success: boolean;
  error?: string;
  models?: string[];
}

export default function Settings() {
  const navigate = useNavigate();
  const {
    configs,
    loading,
    saving,
    promptAssistanceProvider,
    fetchConfigs,
    updateConfig,
    saveConfigs,
    testConnection,
    setPromptAssistanceProvider,
  } = useSettingsStore();
  const [localConfigs, setLocalConfigs] = useState(configs);
  const [testingProviders, setTestingProviders] = useState<Record<LLMProvider, boolean>>({
    openai: false,
    anthropic: false,
    gemini: false,
  });
  const [testResults, setTestResults] = useState<Record<LLMProvider, TestResult | null>>({
    openai: null,
    anthropic: null,
    gemini: null,
  });

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  useEffect(() => {
    setLocalConfigs(configs);
  }, [configs]);

  const getConfig = (provider: LLMProvider) => {
    return localConfigs.find((c) => c.provider === provider);
  };

  const handleToggleProvider = (provider: LLMProvider) => {
    const newConfigs = localConfigs.map((c) =>
      c.provider === provider ? { ...c, enabled: !c.enabled } : c
    );
    setLocalConfigs(newConfigs);
  };

  const handleModelChange = (provider: LLMProvider, model: string) => {
    const newConfigs = localConfigs.map((c) => (c.provider === provider ? { ...c, model } : c));
    setLocalConfigs(newConfigs);
  };

  const handleTestConnection = async (provider: LLMProvider) => {
    setTestingProviders((prev) => ({ ...prev, [provider]: true }));
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    const result = await testConnection(provider);

    setTestingProviders((prev) => ({ ...prev, [provider]: false }));
    setTestResults((prev) => ({ ...prev, [provider]: result }));

    if (result.success) {
      toast.success(
        `${PROVIDER_LABELS[provider]} API key is valid! Found ${result.models?.length || 0} models.`
      );

      // Auto-select the first model if available and current model is not in the list
      if (result.models && result.models.length > 0) {
        const config = getConfig(provider);
        if (config && !result.models.includes(config.model)) {
          handleModelChange(provider, result.models[0]);
        }
      }
    } else {
      toast.error(`${PROVIDER_LABELS[provider]} validation failed: ${result.error}`);
    }
  };

  const handleSave = async () => {
    // Update all configs in the store
    for (const config of localConfigs) {
      await updateConfig(config.provider, config);
    }

    // Save to database
    await saveConfigs();

    toast.success('Settings saved successfully!');
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="flex-1 bg-black overflow-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-8 pt-20 md:pt-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400 text-sm md:text-base">
            Configure your LLM provider preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* API Keys Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-blue-400 font-semibold mb-1">API Keys Configuration</h3>
                <p className="text-gray-300 text-sm">
                  API keys are stored securely in Supabase secrets (server-side) and managed by
                  administrators. Use this page to configure which providers are enabled and their
                  model preferences.
                </p>
              </div>
            </div>
          </div>

          {/* Prompt Assistance */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Sparkles className="text-purple-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Prompt Assistance</h2>
                <p className="text-gray-400 text-sm">
                  Choose which LLM helps you write better prompts
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                AI Assistant Provider
              </label>
              <select
                value={promptAssistanceProvider}
                onChange={(e) => setPromptAssistanceProvider(e.target.value as LLMProvider)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-purple-500 transition-colors"
              >
                <option value="openai">{PROVIDER_LABELS.openai}</option>
                <option value="anthropic">{PROVIDER_LABELS.anthropic}</option>
                <option value="gemini">{PROVIDER_LABELS.gemini}</option>
              </select>
              <p className="text-gray-500 text-sm mt-2">
                This provider will be used when you click the sparkle button on the prompt creation
                form to improve your prompts.
              </p>
            </div>
          </div>

          {/* LLM Providers */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Key className="text-cyan-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">LLM Providers</h2>
                <p className="text-gray-400 text-sm">Enable providers and select models</p>
              </div>
            </div>

            <div className="space-y-6">
              {(['openai', 'anthropic', 'gemini'] as LLMProvider[]).map((provider) => {
                const config = getConfig(provider);
                const isTesting = testingProviders[provider];
                const testResult = testResults[provider];

                return (
                  <div key={provider} className="border border-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config?.enabled ?? false}
                            onChange={() => handleToggleProvider(provider)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-cyan-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                        </label>
                        <div>
                          <h3 className="text-white font-medium">{PROVIDER_LABELS[provider]}</h3>
                          <p className="text-gray-500 text-sm">
                            {config?.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>

                      {/* Test Connection Button */}
                      <button
                        onClick={() => handleTestConnection(provider)}
                        disabled={isTesting}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                      >
                        {isTesting ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            Test Connection
                          </>
                        )}
                      </button>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                      <div
                        className={`mb-4 p-3 rounded-lg border ${
                          testResult.success
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {testResult.success ? (
                            <CheckCircle className="text-green-400 shrink-0 mt-0.5" size={16} />
                          ) : (
                            <XCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                          )}
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                testResult.success ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {testResult.success ? 'Connection successful!' : 'Connection failed'}
                            </p>
                            {testResult.success && testResult.models && (
                              <p className="text-xs text-gray-400 mt-1">
                                Found {testResult.models.length} available models
                              </p>
                            )}
                            {!testResult.success && testResult.error && (
                              <p className="text-xs text-red-300 mt-1">{testResult.error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {config?.enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Model
                        </label>
                        <select
                          value={config.model}
                          onChange={(e) => handleModelChange(provider, e.target.value)}
                          disabled={!testResult?.success || !testResult?.models}
                          className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testResult?.success && testResult?.models ? (
                            testResult.models.map((model) => (
                              <option key={model} value={model}>
                                {model}
                              </option>
                            ))
                          ) : (
                            <option value="">Test connection to load models</option>
                          )}
                        </select>
                        {!testResult?.success && (
                          <p className="text-gray-500 text-xs mt-2">
                            Click "Test Connection" to load available models from the API
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="px-6 py-3 text-gray-400 font-semibold hover:text-white transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

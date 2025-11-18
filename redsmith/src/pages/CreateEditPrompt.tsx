import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { useSeedPromptsStore } from '../stores/seedPromptsStore';
import { useAuthStore } from '../stores/authStore';
import { useSettingsStore } from '../stores/settingsStore';
import { improvePrompt } from '../lib/llm/promptAssistant';
import { toast } from '../lib/utils/toast';
import ErrorPage from '../routes/ErrorPage';
import type { SeedPrompt } from '../lib/supabase/types';
import type { PromptRouteParams } from '../types/routes';
import { ROUTES, buildRoute } from '../types/routes';

export default function CreateEditPrompt() {
  const navigate = useNavigate();
  const { id: promptId } = useParams<PromptRouteParams>();
  const isEditing = !!promptId;
  const { createPrompt, updatePrompt, fetchPromptById, loading } = useSeedPromptsStore();
  const { user } = useAuthStore();
  const { promptAssistanceProvider } = useSettingsStore();
  const [error, setError] = useState('');
  const [improving, setImproving] = useState(false);
  const [promptNotFound, setPromptNotFound] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prompt_text: '',
    type: 'wallet_attack' as 'wallet_attack' | 'benign' | 'ambiguous',
    goal: 'drain_funds' as 'drain_funds' | 'approve_spender' | 'swap' | 'test',
    attack_vector: 'injection' as 'injection' | 'direct_request' | 'roleplay' | 'multi_turn',
    obfuscation_level: 'none' as 'none' | 'low' | 'medium' | 'high',
    requires_tool: true,
  });

  // Load prompt data if editing
  useEffect(() => {
    if (isEditing && promptId) {
      fetchPromptById(promptId).then((prompt) => {
        if (prompt) {
          setFormData({
            title: prompt.title,
            description: prompt.description,
            prompt_text: prompt.prompt_text,
            type: prompt.type,
            goal: prompt.goal,
            attack_vector: prompt.attack_vector,
            obfuscation_level: prompt.obfuscation_level,
            requires_tool: prompt.requires_tool,
          });
        } else {
          // Prompt not found in database
          setPromptNotFound(true);
        }
      });
    }
  }, [isEditing, promptId, fetchPromptById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in');
      return;
    }

    if (isEditing && promptId) {
      // Update existing prompt
      const { error: updateError } = await updatePrompt(promptId, formData);
      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      // Create new prompt
      const { error: createError } = await createPrompt({
        ...formData,
        user_id: user.id,
      });
      if (createError) {
        setError(createError.message);
        return;
      }
    }

    // Navigate to the prompt detail page if we have the new ID, otherwise dashboard
    if (isEditing && promptId) {
      navigate(buildRoute.promptDetail(promptId));
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  const handleImprovePrompt = async () => {
    setImproving(true);
    setError('');

    try {
      const improvedText = await improvePrompt({
        promptText: formData.prompt_text,
        injectionType: formData.type,
        targetGoal: formData.goal,
        provider: promptAssistanceProvider,
      });

      setFormData({ ...formData, prompt_text: improvedText });
      toast.success('Prompt improved successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to improve prompt:', error);
      toast.error(`Failed to improve prompt: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setImproving(false);
    }
  };

  // Show error page if prompt not found in edit mode
  if (isEditing && promptNotFound) {
    return <ErrorPage type="not-found" message="Prompt not found" />;
  }

  return (
    <div className="flex-1 bg-black overflow-auto">
      <div className="max-w-5xl mx-auto p-8">
        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            {isEditing ? 'Edit Seed Prompt' : 'Create New Seed Prompt'}
          </h1>
          <p className="text-gray-400">
            {isEditing
              ? 'Update your prompt injection test case'
              : 'Create a new prompt injection test case for LLM guardrails'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Basic Information</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
                  placeholder="e.g., Social Engineering Transfer Attack"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-cyan-500 transition-colors resize-none"
                  placeholder="Brief description of what this test case validates..."
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="prompt_text" className="block text-sm font-medium text-gray-300">
                    Prompt
                  </label>
                  <button
                    type="button"
                    onClick={handleImprovePrompt}
                    disabled={improving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-purple-500/20"
                    title="Improve prompt with AI"
                  >
                    <Sparkles size={14} className={improving ? 'animate-spin' : ''} />
                    {improving ? 'Improving...' : 'Improve with AI'}
                  </button>
                </div>
                <textarea
                  id="prompt_text"
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-cyan-500 transition-colors resize-none font-mono text-sm"
                  placeholder="The actual user message that will be tested..."
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Classification</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-2">
                  Type
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as SeedPrompt['type'] })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors"
                >
                  <option value="wallet_attack">Wallet Attack</option>
                  <option value="benign">Benign</option>
                  <option value="ambiguous">Ambiguous</option>
                </select>
              </div>

              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-300 mb-2">
                  Goal
                </label>
                <select
                  id="goal"
                  value={formData.goal}
                  onChange={(e) =>
                    setFormData({ ...formData, goal: e.target.value as SeedPrompt['goal'] })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors"
                >
                  <option value="drain_funds">Drain Funds</option>
                  <option value="approve_spender">Approve Spender</option>
                  <option value="swap">Swap</option>
                  <option value="test">Test</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="attack_vector"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Attack Vector
                </label>
                <select
                  id="attack_vector"
                  value={formData.attack_vector}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      attack_vector: e.target.value as SeedPrompt['attack_vector'],
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors"
                >
                  <option value="injection">Injection</option>
                  <option value="direct_request">Direct Request</option>
                  <option value="roleplay">Roleplay</option>
                  <option value="multi_turn">Multi-turn</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="obfuscation_level"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Obfuscation Level
                </label>
                <select
                  id="obfuscation_level"
                  value={formData.obfuscation_level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      obfuscation_level: e.target.value as 'none' | 'low' | 'medium' | 'high',
                    })
                  }
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors"
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_tool}
                  onChange={(e) => setFormData({ ...formData, requires_tool: e.target.checked })}
                  className="w-5 h-5 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                />
                <span className="text-gray-300">Requires tool call</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? 'Saving...' : isEditing ? 'Update Prompt' : 'Create Prompt'}
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTES.PROMPTS)}
              className="px-6 py-3 text-gray-400 font-semibold hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  FileJson,
  FileText,
  Copy,
  Sparkles,
} from 'lucide-react';
import { useSeedPromptsStore } from '../stores/seedPromptsStore';
import { useGenerationStore } from '../stores/generationStore';
import { useMutationsStore } from '../stores/mutationsStore';
import GenerationConfigForm from '../components/generation/GenerationConfigForm';
import JobProgress from '../components/generation/JobProgress';
import VariationCard from '../components/generation/VariationCard';
import { exportSinglePromptToCSV, exportSinglePromptToJSON } from '../lib/utils/export';
import { toast } from '../lib/utils/toast';
import DuplicatePromptDialog from '../components/DuplicatePromptDialog';
import DetailSkeleton from '../components/skeletons/DetailSkeleton';
import ErrorPage from '../routes/ErrorPage';
import type { DuplicateOptions } from '../stores/seedPromptsStore';
import type { PromptRouteParams } from '../types/routes';
import { ROUTES, buildRoute } from '../types/routes';
import ApplyMutationsToAllDialog from '../components/mutations/ApplyMutationsToAllDialog';

export default function PromptDetail() {
  const navigate = useNavigate();
  const { id: promptId } = useParams<PromptRouteParams>();
  const { prompts, fetchPromptById, deletePrompt, duplicatePrompt } = useSeedPromptsStore();
  const { variations, fetchVariationsBySeedId, jobs, subscribeToVariations } = useGenerationStore();
  const { mutations, subscribeToMutations, fetchMutationsByVariationIds } = useMutationsStore();
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showMutateAllDialog, setShowMutateAllDialog] = useState(false);

  const prompt = prompts.find((p) => p.id === promptId);

  // Load initial data
  useEffect(() => {
    if (!promptId) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPromptById(promptId), fetchVariationsBySeedId(promptId)]);
      setLoading(false);
    };

    loadData();
  }, [promptId, fetchPromptById, fetchVariationsBySeedId]);

  // Subscribe to real-time variations updates
  useEffect(() => {
    if (!promptId) return;

    const unsubscribe = subscribeToVariations(promptId);

    return () => {
      unsubscribe();
    };
  }, [promptId, subscribeToVariations]);

  // Fetch mutations when variations are loaded
  useEffect(() => {
    if (variations.length === 0) {
      return;
    }

    const variationIds = variations.map((v) => v.id);
    fetchMutationsByVariationIds(variationIds);
  }, [variations, fetchMutationsByVariationIds]);

  // Subscribe to real-time mutations updates
  useEffect(() => {
    if (variations.length === 0) {
      return;
    }

    const variationIds = variations.map((v) => v.id);
    const unsubscribe = subscribeToMutations(variationIds);

    return () => {
      unsubscribe();
    };
  }, [variations, subscribeToMutations]);

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this prompt? This will also delete all its variations.'
      )
    ) {
      return;
    }

    await deletePrompt(promptId!);
    toast.success('Prompt deleted successfully');
    navigate(ROUTES.DASHBOARD);
  };

  const handleExportCSV = () => {
    if (!prompt) return;

    const promptWithData = {
      ...prompt,
      variations,
      mutations,
    };

    exportSinglePromptToCSV(promptWithData);
    toast.success('Exported to CSV');
  };

  const handleExportJSON = () => {
    if (!prompt) return;

    const promptWithData = {
      ...prompt,
      variations,
      mutations,
    };

    exportSinglePromptToJSON(promptWithData);
    toast.success('Exported to JSON');
  };

  const handleJobStarted = (jobId: string) => {
    setActiveJobId(jobId);
  };

  const handleDuplicateConfirm = async (options: DuplicateOptions) => {
    const { data, error } = await duplicatePrompt(promptId!, options);

    if (error) {
      toast.error(`Failed to duplicate prompt: ${error.message}`);
    } else if (data) {
      toast.success('Prompt duplicated successfully!');
      // Navigate to the duplicated prompt
      navigate(buildRoute.promptDetail(data.id));
    }

    setShowDuplicateDialog(false);
  };

  // Find the most recent job for this seed
  const recentJob = jobs
    .filter((j) => j.seed_prompt_id === promptId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  // Handle missing promptId before hooks
  if (!promptId) {
    return <ErrorPage type="not-found" message="Prompt ID is missing" />;
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!prompt) {
    return <ErrorPage type="not-found" message="Prompt not found" />;
  }

  return (
    <div className="flex-1 bg-black overflow-auto">
      <div className="max-w-6xl mx-auto p-4 md:p-8 pt-20 md:pt-8">
        <button
          onClick={() => navigate(ROUTES.DASHBOARD)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors touch-manipulation"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>

        {/* Prompt Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{prompt.title}</h1>
              <p className="text-gray-400 text-sm md:text-base">{prompt.description}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Export Dropdown */}
              <div className="relative group flex-1 md:flex-initial">
                <button className="w-full md:w-auto px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 touch-manipulation">
                  <Download size={18} />
                  <span>Export</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-700 transition-colors rounded-t-lg"
                  >
                    <FileText size={18} />
                    Export as CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-700 transition-colors rounded-b-lg"
                  >
                    <FileJson size={18} />
                    Export as JSON
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowDuplicateDialog(true)}
                className="flex-1 md:flex-initial px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 touch-manipulation"
              >
                <Copy size={18} />
                <span className="md:inline">Duplicate</span>
              </button>
              <button
                onClick={() => navigate(buildRoute.editPrompt(promptId!))}
                className="flex-1 md:flex-initial px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 touch-manipulation"
              >
                <Edit size={18} />
                <span className="md:inline">Edit</span>
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 md:flex-initial px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20 flex items-center justify-center gap-2 touch-manipulation"
              >
                <Trash2 size={18} />
                <span className="md:inline">Delete</span>
              </button>
            </div>
          </div>

          {/* Metadata Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">
              {prompt.type}
            </span>
            <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">
              Goal: {prompt.goal}
            </span>
            <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">
              {prompt.attack_vector}
            </span>
            <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">
              Obfuscation: {prompt.obfuscation_level}
            </span>
            {prompt.requires_tool && (
              <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs border border-cyan-500/20">
                Requires Tool
              </span>
            )}
          </div>

          {/* Seed Prompt Content */}
          <div className="bg-black border border-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Seed Prompt</h3>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
              {prompt.prompt_text}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Generation Form */}
          <div className="lg:col-span-1">
            <GenerationConfigForm seedPromptId={promptId} onJobStarted={handleJobStarted} />

            {/* Show active job progress */}
            {(activeJobId || recentJob) && (
              <div className="mt-6">
                <JobProgress
                  jobId={activeJobId || recentJob?.id}
                  onClose={() => setActiveJobId(null)}
                />
              </div>
            )}
          </div>

          {/* Right Column: Variations */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Generated Variations</h2>
                <p className="text-gray-400 text-sm">
                  {variations.length} variation{variations.length !== 1 ? 's' : ''} generated
                </p>
              </div>
              {variations.length > 0 && (
                <button
                  onClick={() => setShowMutateAllDialog(true)}
                  className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/20 flex items-center gap-2"
                >
                  <Sparkles size={18} />
                  <span>Mutate All</span>
                </button>
              )}
            </div>

            {variations.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <p className="text-gray-400 mb-2">No variations generated yet</p>
                <p className="text-gray-500 text-sm">
                  Use the form on the left to generate variations with your selected LLM providers
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {variations.map((variation) => (
                  <VariationCard key={variation.id} variation={variation} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Duplicate Prompt Dialog */}
      <DuplicatePromptDialog
        isOpen={showDuplicateDialog}
        onClose={() => setShowDuplicateDialog(false)}
        onConfirm={handleDuplicateConfirm}
        promptTitle={prompt.title}
        hasVariations={variations.length > 0}
        hasMutations={mutations.length > 0}
      />

      {/* Mutate All Dialog */}
      {showMutateAllDialog && (
        <ApplyMutationsToAllDialog
          variations={variations}
          onClose={() => setShowMutateAllDialog(false)}
          onSuccess={() => {
            // Refresh variations to show the new mutations
            fetchVariationsBySeedId(promptId!);
          }}
        />
      )}
    </div>
  );
}

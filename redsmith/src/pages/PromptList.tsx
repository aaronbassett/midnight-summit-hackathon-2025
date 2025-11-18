import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Download, MoreVertical, Edit, Copy, Trash2 } from 'lucide-react';
import { useSeedPromptsStore } from '../stores/seedPromptsStore';
import { toast } from '../lib/utils/toast';
import DuplicatePromptDialog from '../components/DuplicatePromptDialog';
import BulkActionsToolbar from '../components/BulkActionsToolbar';
import BulkGenerateVariationsDialog from '../components/BulkGenerateVariationsDialog';
import ExportDialog from '../components/ExportDialog';
import TableSkeleton from '../components/skeletons/TableSkeleton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { ROUTES, buildRoute } from '../types/routes';
import type { DuplicateOptions } from '../stores/seedPromptsStore';

export default function PromptList() {
  const navigate = useNavigate();
  const {
    prompts,
    fetchPrompts,
    loading,
    deletePrompt,
    duplicatePrompt,
    selectedPromptIds,
    toggleSelection,
    selectAll,
    deselectAll,
    bulkDelete,
    bulkDuplicate,
  } = useSeedPromptsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedGoal, setSelectedGoal] = useState<string>('all');
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [duplicateDialog, setDuplicateDialog] = useState<{
    isOpen: boolean;
    promptId: string | null;
    promptTitle: string;
    hasVariations: boolean;
    hasMutations: boolean;
    isBulk: boolean;
  }>({
    isOpen: false,
    promptId: null,
    promptTitle: '',
    hasVariations: false,
    hasMutations: false,
    isBulk: false,
  });
  const [bulkGenerateDialogOpen, setBulkGenerateDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Keyboard shortcut to focus search
  useKeyboardShortcuts([
    {
      key: '/',
      description: 'Focus search',
      handler: () => searchInputRef.current?.focus(),
    },
  ]);

  // Filter prompts based on search and filters
  const filteredPrompts = useMemo(() => {
    return prompts.filter((prompt) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.prompt_text.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = selectedType === 'all' || prompt.type === selectedType;

      // Goal filter
      const matchesGoal = selectedGoal === 'all' || prompt.goal === selectedGoal;

      return matchesSearch && matchesType && matchesGoal;
    });
  }, [prompts, searchQuery, selectedType, selectedGoal]);

  const handleExport = () => {
    setExportDialogOpen(true);
  };

  const handleDuplicateClick = async (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    // TODO: Fetch variation and mutation counts from the database
    // For now, we'll assume false (can be enhanced later)
    setDuplicateDialog({
      isOpen: true,
      promptId: prompt.id,
      promptTitle: prompt.title,
      hasVariations: false,
      hasMutations: false,
      isBulk: false,
    });
    setShowActionsMenu(null);
  };

  const handleDuplicateConfirm = async (options: DuplicateOptions) => {
    if (duplicateDialog.isBulk) {
      // Bulk duplicate
      const ids = Array.from(selectedPromptIds);
      const { succeeded, failed } = await bulkDuplicate(ids, options);

      if (failed > 0) {
        toast.error(`Duplicated ${succeeded} prompt(s), ${failed} failed`);
      } else {
        toast.success(`Successfully duplicated ${succeeded} prompt(s)`);
      }
    } else if (duplicateDialog.promptId) {
      // Single duplicate
      const { data, error } = await duplicatePrompt(duplicateDialog.promptId, options);

      if (error) {
        toast.error(`Failed to duplicate prompt: ${error.message}`);
      } else if (data) {
        toast.success('Prompt duplicated successfully!');
        // Navigate to the duplicated prompt
        navigate(buildRoute.promptDetail(data.id));
      }
    }
  };

  const handleDeleteClick = async (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    if (window.confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      const { error } = await deletePrompt(promptId);
      if (error) {
        toast.error(`Failed to delete prompt: ${error.message}`);
      } else {
        toast.success('Prompt deleted successfully!');
      }
    }
    setShowActionsMenu(null);
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    const count = selectedPromptIds.size;
    if (!window.confirm(`Are you sure you want to delete ${count} prompt(s)?`)) {
      return;
    }

    const ids = Array.from(selectedPromptIds);
    const { succeeded, failed } = await bulkDelete(ids);

    if (failed > 0) {
      toast.error(`Deleted ${succeeded} prompt(s), ${failed} failed`);
    } else {
      toast.success(`Successfully deleted ${succeeded} prompt(s)`);
    }
  };

  const handleBulkDuplicate = () => {
    setDuplicateDialog({
      isOpen: true,
      promptId: null,
      promptTitle: `${selectedPromptIds.size} prompts`,
      hasVariations: false,
      hasMutations: false,
      isBulk: true,
    });
  };

  const handleBulkGenerateVariations = () => {
    setBulkGenerateDialogOpen(true);
  };

  const handleSelectAll = () => {
    if (selectedPromptIds.size === filteredPrompts.length) {
      deselectAll();
    } else {
      selectAll(filteredPrompts.map((p) => p.id));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'wallet_attack':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'benign':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'ambiguous':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="flex-1 bg-black overflow-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-20 md:pt-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">All Prompts</h1>
            <p className="text-gray-400 text-sm md:text-base">
              Browse and manage your prompt injection test cases ({filteredPrompts.length}{' '}
              {filteredPrompts.length === 1 ? 'prompt' : 'prompts'})
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all border border-gray-700 touch-manipulation"
            >
              <Download size={20} />
              <span>Export</span>
            </button>

            <button
              onClick={() => navigate(ROUTES.CREATE)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 touch-manipulation"
            >
              <Plus size={20} />
              <span>New Seed Prompt</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts... (press / to focus)"
                className="w-full pl-12 pr-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-hidden focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="pl-10 pr-8 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors appearance-none"
                >
                  <option value="all">All Types</option>
                  <option value="wallet_attack">Wallet Attack</option>
                  <option value="benign">Benign</option>
                  <option value="ambiguous">Ambiguous</option>
                </select>
              </div>

              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:outline-hidden focus:border-cyan-500 transition-colors"
              >
                <option value="all">All Goals</option>
                <option value="drain_funds">Drain Funds</option>
                <option value="approve_spender">Approve Spender</option>
                <option value="swap">Swap</option>
                <option value="test">Test</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={10} columns={7} />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedPromptIds.size === filteredPrompts.length &&
                          filteredPrompts.length > 0
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                      />
                    </th>
                    <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Title</th>
                    <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Type</th>
                    <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">Goal</th>
                    <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">
                      Vector
                    </th>
                    <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">
                      Obfuscation
                    </th>
                    <th className="text-left px-6 py-4 text-gray-400 font-medium text-sm">
                      Updated
                    </th>
                    <th className="text-right px-6 py-4 text-gray-400 font-medium text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrompts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                        {prompts.length === 0
                          ? 'No prompts yet. Create your first seed prompt!'
                          : 'No prompts match your filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPrompts.map((prompt) => (
                      <tr
                        key={prompt.id}
                        className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                          selectedPromptIds.has(prompt.id) ? 'bg-cyan-500/5' : ''
                        }`}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedPromptIds.has(prompt.id)}
                            onChange={() => toggleSelection(prompt.id)}
                            className="w-4 h-4 rounded-sm bg-black border-gray-700 text-cyan-500 focus:ring-2 focus:ring-cyan-500 focus:ring-offset-0"
                          />
                        </td>
                        <td
                          onClick={() => navigate(buildRoute.promptDetail(prompt.id))}
                          className="px-6 py-4 cursor-pointer"
                        >
                          <div>
                            <div className="text-white font-medium mb-1">{prompt.title}</div>
                            <div className="text-gray-400 text-sm line-clamp-1">
                              {prompt.description}
                            </div>
                          </div>
                        </td>
                        <td
                          onClick={() => navigate(buildRoute.promptDetail(prompt.id))}
                          className="px-6 py-4 cursor-pointer"
                        >
                          <span
                            className={`inline-block px-2 py-1 rounded-sm border text-xs ${getTypeColor(prompt.type)}`}
                          >
                            {prompt.type}
                          </span>
                        </td>
                        <td
                          onClick={() => navigate(buildRoute.promptDetail(prompt.id))}
                          className="px-6 py-4 text-gray-300 text-sm cursor-pointer"
                        >
                          {prompt.goal}
                        </td>
                        <td
                          onClick={() => navigate(buildRoute.promptDetail(prompt.id))}
                          className="px-6 py-4 text-gray-300 text-sm cursor-pointer"
                        >
                          {prompt.attack_vector}
                        </td>
                        <td
                          onClick={() => navigate(buildRoute.promptDetail(prompt.id))}
                          className="px-6 py-4 text-gray-300 text-sm cursor-pointer"
                        >
                          {prompt.obfuscation_level}
                        </td>
                        <td
                          onClick={() => navigate(buildRoute.promptDetail(prompt.id))}
                          className="px-6 py-4 text-gray-400 text-sm cursor-pointer"
                        >
                          {new Date(prompt.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowActionsMenu(
                                    showActionsMenu === prompt.id ? null : prompt.id
                                  );
                                }}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <MoreVertical size={18} />
                              </button>
                              {showActionsMenu === prompt.id && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(buildRoute.editPrompt(prompt.id));
                                      setShowActionsMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-700 transition-colors rounded-t-lg"
                                  >
                                    <Edit size={18} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => handleDuplicateClick(prompt.id, e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-700 transition-colors"
                                  >
                                    <Copy size={18} />
                                    Duplicate
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteClick(prompt.id, e)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-700 transition-colors rounded-b-lg"
                                  >
                                    <Trash2 size={18} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center px-4 md:px-0">
          <div className="flex items-center gap-2 w-full md:w-auto justify-center">
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 touch-manipulation">
              Previous
            </button>
            <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg touch-manipulation">
              1
            </button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors touch-manipulation hidden sm:block">
              2
            </button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors touch-manipulation hidden sm:block">
              3
            </button>
            <button className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-700 touch-manipulation">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate Prompt Dialog */}
      <DuplicatePromptDialog
        isOpen={duplicateDialog.isOpen}
        onClose={() => setDuplicateDialog({ ...duplicateDialog, isOpen: false })}
        onConfirm={handleDuplicateConfirm}
        promptTitle={duplicateDialog.promptTitle}
        hasVariations={duplicateDialog.hasVariations}
        hasMutations={duplicateDialog.hasMutations}
      />

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedPromptIds.size}
        onDeselectAll={deselectAll}
        onBulkDelete={handleBulkDelete}
        onBulkDuplicate={handleBulkDuplicate}
        onBulkGenerateVariations={handleBulkGenerateVariations}
      />

      {/* Bulk Generate Variations Dialog */}
      <BulkGenerateVariationsDialog
        isOpen={bulkGenerateDialogOpen}
        onClose={() => setBulkGenerateDialogOpen(false)}
        selectedPromptIds={Array.from(selectedPromptIds)}
        promptCount={selectedPromptIds.size}
      />

      {/* Export Dialog */}
      <ExportDialog isOpen={exportDialogOpen} onClose={() => setExportDialogOpen(false)} />
    </div>
  );
}

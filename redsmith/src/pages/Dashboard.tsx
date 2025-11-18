import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, FileText, Zap, Clock, Radio, Upload } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboardStore';
import { useSeedPromptsStore } from '../stores/seedPromptsStore';
import DashboardSkeleton from '../components/skeletons/DashboardSkeleton';
import ImportSeedPromptsDialog from '../components/ImportSeedPromptsDialog';
import { ROUTES, buildRoute } from '../types/routes';

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, fetchStats, subscribeToStats, loading: statsLoading } = useDashboardStore();
  const { prompts, fetchPrompts, loading: promptsLoading } = useSeedPromptsStore();
  const [isLive, setIsLive] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetchStats();
    fetchPrompts();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToStats(() => {
      // Refetch stats when any table changes
      fetchStats();
      fetchPrompts();

      // Flash the live indicator
      setIsLive(true);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [fetchStats, fetchPrompts, subscribeToStats]);

  // Show skeleton while loading initial data
  if (statsLoading && stats.total_seeds === 0) {
    return <DashboardSkeleton />;
  }

  // Get recent 3 prompts for display
  const recentPrompts = prompts.slice(0, 3);

  const handleImportSuccess = () => {
    // Refresh stats and prompts after successful import
    fetchStats();
    fetchPrompts();

    // Flash the live indicator
    setIsLive(true);
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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white">Dashboard</h1>
              {isLive && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                    <span className="relative w-2 h-2 bg-green-400 rounded-full"></span>
                  </div>
                  <span className="text-green-400 text-xs font-medium">Live</span>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm md:text-base">
              Monitor your prompt injection test suite in real-time
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsImportDialogOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all border border-gray-700 w-full md:w-auto touch-manipulation"
            >
              <Upload size={20} />
              <span>Import Seed Prompts</span>
            </button>
            <button
              onClick={() => navigate(ROUTES.CREATE)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20 w-full md:w-auto touch-manipulation"
            >
              <Plus size={20} />
              <span>New Seed Prompt</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <FileText className="text-cyan-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.total_seeds}</div>
            <div className="text-gray-400 text-sm">Seed Prompts</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="text-blue-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats.total_variations.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Variations</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Zap className="text-purple-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {stats.total_mutations.toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Mutations</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Radio className="text-yellow-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.active_jobs}</div>
            <div className="text-gray-400 text-sm">Active Jobs</div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="text-green-400" size={24} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stats.completed_jobs}</div>
            <div className="text-gray-400 text-sm">Completed</div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Recent Seed Prompts</h2>
            <button
              onClick={() => navigate(ROUTES.PROMPTS)}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              View All
            </button>
          </div>

          <div className="space-y-4">
            {promptsLoading ? (
              <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : recentPrompts.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No prompts yet. Create your first seed prompt to get started!
              </div>
            ) : (
              recentPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => navigate(buildRoute.promptDetail(prompt.id))}
                  className="bg-black border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1 group-hover:text-cyan-400 transition-colors">
                        {prompt.title}
                      </h3>
                      <p className="text-gray-400 text-sm line-clamp-2">{prompt.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded-sm border ${getTypeColor(prompt.type)}`}>
                      {prompt.type}
                    </span>
                    <span className="text-gray-500">Goal: {prompt.goal}</span>
                    <span className="text-gray-500">Vector: {prompt.attack_vector}</span>
                    <span className="text-gray-600 ml-auto">
                      {new Date(prompt.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ImportSeedPromptsDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}

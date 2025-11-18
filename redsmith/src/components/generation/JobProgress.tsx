import { useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';
import { useGenerationStore } from '../../stores/generationStore';

interface JobProgressProps {
  jobId: string;
  onClose?: () => void;
}

interface JobProgress {
  completed: number;
  total: number;
}

interface JobError {
  provider: string;
  message: string;
}

export default function JobProgress({ jobId, onClose }: JobProgressProps) {
  const { jobs, subscribeToJob, fetchJobs, cancelGeneration } = useGenerationStore();
  const job = jobs.find((j) => j.id === jobId);

  useEffect(() => {
    // Fetch jobs initially
    fetchJobs();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToJob(jobId, () => {
      fetchJobs(); // Refresh jobs when update received
    });

    return unsubscribe;
  }, [jobId, subscribeToJob, fetchJobs]);

  if (!job) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center text-gray-400">Loading job...</div>
      </div>
    );
  }

  const progress = (job.progress as unknown as JobProgress) || { completed: 0, total: 0 };
  const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  const getStatusIcon = () => {
    switch (job.status) {
      case 'running':
      case 'pending':
        return <Loader2 className="text-cyan-400 animate-spin" size={20} />;
      case 'completed':
        return <CheckCircle className="text-green-400" size={20} />;
      case 'failed':
        return <XCircle className="text-red-400" size={20} />;
      case 'partial_success':
        return <AlertTriangle className="text-yellow-400" size={20} />;
      case 'interrupted':
        return <XCircle className="text-gray-400" size={20} />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    switch (job.status) {
      case 'pending':
        return 'Pending';
      case 'running':
        return 'Generating...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'partial_success':
        return 'Partial Success';
      case 'interrupted':
        return 'Cancelled';
      default:
        return job.status;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'running':
      case 'pending':
        return 'text-cyan-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      case 'partial_success':
        return 'text-yellow-400';
      case 'interrupted':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this generation job?')) {
      await cancelGeneration(jobId);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Generation Progress</h3>
            <p className={`text-sm font-medium ${getStatusColor()}`}>{getStatusLabel()}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">
            {progress.completed} / {progress.total} variations
          </span>
          <span className="text-gray-400">{Math.round(percentage)}%</span>
        </div>
        <div className="h-2 bg-black rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Job Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Job ID</span>
          <span className="text-gray-300 font-mono text-xs">{job.id.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Started</span>
          <span className="text-gray-300">
            {new Date(job.started_at || job.created_at).toLocaleString()}
          </span>
        </div>
        {job.completed_at && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Completed</span>
            <span className="text-gray-300">{new Date(job.completed_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Errors (if any) */}
      {job.errors && (job.errors as unknown as JobError[]).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <XCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <div className="flex-1">
              <div className="text-red-400 font-medium text-sm mb-2">
                {(job.errors as unknown as JobError[]).length} error(s) occurred
              </div>
              <div className="space-y-1 text-xs text-gray-400">
                {(job.errors as unknown as JobError[])
                  .slice(0, 3)
                  .map((error: JobError, idx: number) => (
                    <div key={idx}>
                      {error.provider}: {error.message}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Button */}
      {(job.status === 'running' || job.status === 'pending') && (
        <button
          onClick={handleCancel}
          className="w-full px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/20"
        >
          Cancel Generation
        </button>
      )}
    </div>
  );
}

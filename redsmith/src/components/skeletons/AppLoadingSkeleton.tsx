import Skeleton from './Skeleton';

export default function AppLoadingSkeleton() {
  return (
    <div className="flex h-screen bg-black">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 p-6">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 bg-black overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
            <Skeleton className="h-12 w-48" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <Skeleton variant="circular" width={48} height={48} className="mb-4" />
                <Skeleton className="h-8 w-20 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

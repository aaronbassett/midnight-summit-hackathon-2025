import Skeleton from './Skeleton';

export default function DetailSkeleton() {
  return (
    <div className="flex-1 bg-black overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Back Button */}
        <Skeleton className="h-5 w-32 mb-6" />

        {/* Prompt Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <Skeleton className="h-8 w-96 mb-2" />
              <Skeleton className="h-5 w-full max-w-2xl" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          {/* Metadata Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24" />
            ))}
          </div>

          {/* Seed Prompt Content */}
          <div className="bg-black border border-gray-800 rounded-lg p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Generation Form */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <Skeleton className="h-6 w-48 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>

          {/* Right Column: Variations */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <Skeleton className="h-5 w-64 mx-auto mb-2" />
              <Skeleton className="h-4 w-96 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

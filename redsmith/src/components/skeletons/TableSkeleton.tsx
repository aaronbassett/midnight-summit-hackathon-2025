import Skeleton from './Skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export default function TableSkeleton({ rows = 5, columns = 7 }: TableSkeletonProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="text-left px-6 py-4">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
              <th className="text-right px-6 py-4">
                <Skeleton className="h-4 w-16 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-800">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    {colIndex === 0 ? (
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    ) : colIndex === 1 ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <Skeleton className="h-4 w-24" />
                    )}
                  </td>
                ))}
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <Skeleton variant="circular" width={36} height={36} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

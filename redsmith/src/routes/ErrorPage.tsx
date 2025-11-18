import { Link } from 'react-router-dom';
import type { ErrorPageConfig } from '../types/routes';
import { ROUTES } from '../types/routes';

export default function ErrorPage({
  type = 'not-found',
  message,
  returnPath = ROUTES.DASHBOARD,
}: Partial<ErrorPageConfig>) {
  const errorMessages = {
    'not-found': {
      title: 'Page Not Found',
      description: message || "The page you're looking for doesn't exist or has been moved.",
    },
    unauthorized: {
      title: 'Access Denied',
      description: message || "You don't have permission to access this page.",
    },
    generic: {
      title: 'Something Went Wrong',
      description: message || 'An unexpected error occurred. Please try again later.',
    },
  };

  const { title, description } = errorMessages[type];

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <h1 className="mb-2 text-6xl font-bold text-red-500">
            {type === 'not-found' ? '404' : '⚠️'}
          </h1>
          <h2 className="text-2xl font-semibold text-neutral-100">{title}</h2>
        </div>

        <p className="mb-8 text-neutral-400">{description}</p>

        <Link
          to={returnPath}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

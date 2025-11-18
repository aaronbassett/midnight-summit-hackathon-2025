import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import AppLoadingSkeleton from './components/skeletons/AppLoadingSkeleton';
import ErrorBoundary from './components/ErrorBoundary';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import AppRoutes from './routes';
import { useKeyboardShortcuts, type KeyboardShortcut } from './hooks/useKeyboardShortcuts';
import { useAuthStore } from './stores/authStore';
import { ROUTES } from './types/routes';

function App() {
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { user, loading, initialized, initialize } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Define global keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts',
      handler: () => setShowShortcutsHelp(true),
    },
    {
      key: 'Escape',
      description: 'Close dialogs and modals',
      handler: () => setShowShortcutsHelp(false),
    },
    {
      key: 'n',
      description: 'Create new seed prompt',
      handler: () => navigate(ROUTES.CREATE),
    },
    {
      key: 'c',
      description: 'Create new seed prompt',
      handler: () => navigate(ROUTES.CREATE),
    },
    {
      key: 'd',
      description: 'Go to dashboard',
      handler: () => navigate(ROUTES.DASHBOARD),
    },
    {
      key: 'p',
      description: 'Go to prompts list',
      handler: () => navigate(ROUTES.PROMPTS),
    },
    {
      key: 's',
      description: 'Go to settings',
      handler: () => navigate(ROUTES.SETTINGS),
    },
    {
      key: '1',
      description: 'Go to dashboard',
      handler: () => navigate(ROUTES.DASHBOARD),
    },
    {
      key: '2',
      description: 'Go to prompts list',
      handler: () => navigate(ROUTES.PROMPTS),
    },
    {
      key: '3',
      description: 'Go to settings',
      handler: () => navigate(ROUTES.SETTINGS),
    },
  ];

  // Enable shortcuts only when user is authenticated
  useKeyboardShortcuts(shortcuts, !!user);

  // Show loading state while checking auth
  if (!initialized || loading) {
    return <AppLoadingSkeleton />;
  }

  // Show login page if not authenticated - handled by ProtectedRoute
  // But we still need to render the routes structure
  const isAuthRoute = location.pathname === ROUTES.LOGIN;

  return (
    <ErrorBoundary onReset={() => navigate(ROUTES.DASHBOARD)}>
      <div className={isAuthRoute ? '' : 'flex h-screen bg-black'}>
        {/* Only show sidebar for authenticated routes */}
        {!isAuthRoute && user && (
          <ErrorBoundary
            fallback={
              <div className="w-64 bg-gray-900 border-r border-gray-800 flex items-center justify-center">
                <p className="text-gray-500 text-sm text-center p-4">Navigation error</p>
              </div>
            }
          >
            <Sidebar />
          </ErrorBoundary>
        )}

        <ErrorBoundary onReset={() => navigate(ROUTES.DASHBOARD)}>
          <AppRoutes />
        </ErrorBoundary>
      </div>

      <ToastContainer />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts}
      />

      {/* Keyboard Shortcuts Hint */}
      {user && (
        <div className="fixed bottom-4 right-4 z-40 hidden md:block">
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-gray-700 transition-all text-sm flex items-center gap-2"
            title="Keyboard shortcuts"
          >
            <span className="text-xs">Press</span>
            <kbd className="px-2 py-0.5 bg-black border border-gray-700 rounded-sm text-xs">?</kbd>
            <span className="text-xs">for shortcuts</span>
          </button>
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;

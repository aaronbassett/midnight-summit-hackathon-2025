import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '../types/routes';

// Route components
import ProtectedRoute from './ProtectedRoute';
import ErrorPage from './ErrorPage';

// Page components
import LoginPage from '../pages/LoginPage';
import Dashboard from '../pages/Dashboard';
import PromptList from '../pages/PromptList';
import PromptDetail from '../pages/PromptDetail';
import CreateEditPrompt from '../pages/CreateEditPrompt';
import Settings from '../pages/Settings';

/**
 * Application Routes
 *
 * Defines all application routes including:
 * - Public routes (login)
 * - Protected routes (all authenticated pages)
 * - Error routes (404)
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />

      {/* Protected Routes - All wrapped in ProtectedRoute layout */}
      <Route element={<ProtectedRoute />}>
        {/* Root redirects to dashboard */}
        <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.DASHBOARD} replace />} />

        {/* Main pages */}
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.PROMPTS} element={<PromptList />} />
        <Route path={ROUTES.PROMPT_DETAIL} element={<PromptDetail />} />
        <Route path={ROUTES.CREATE} element={<CreateEditPrompt />} />
        <Route path={ROUTES.EDIT} element={<CreateEditPrompt />} />
        <Route path={ROUTES.SETTINGS} element={<Settings />} />
      </Route>

      {/* 404 Catch-all Route */}
      <Route path={ROUTES.NOT_FOUND} element={<ErrorPage type="not-found" />} />
    </Routes>
  );
}

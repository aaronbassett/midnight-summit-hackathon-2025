/**
 * Route Contracts: Page Routing Feature
 *
 * This file defines the contract for all application routes, their paths,
 * parameters, and requirements. This serves as the single source of truth
 * for navigation throughout the application.
 *
 * Date: 2025-11-17
 * Feature: 002-page-routing
 */

// ============================================================================
// Route Path Constants
// ============================================================================

/**
 * Application route paths.
 * Use these constants instead of hardcoded strings for type-safety and refactoring.
 */
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Protected routes
  ROOT: '/',
  DASHBOARD: '/dashboard',
  PROMPTS: '/prompts',
  PROMPT_DETAIL: '/prompt/:id',
  CREATE: '/create',
  EDIT: '/edit/:id',
  SETTINGS: '/settings',

  // Error routes
  NOT_FOUND: '*',
} as const;

// ============================================================================
// Route Builder Functions
// ============================================================================

/**
 * Type-safe route builders for parameterized routes.
 * These functions generate routes with proper parameter substitution.
 */
export const buildRoute = {
  /**
   * Build prompt detail route
   * @param id - Prompt UUID
   * @returns /prompt/:id with id substituted
   */
  promptDetail: (id: string): string => `/prompt/${id}`,

  /**
   * Build prompt edit route
   * @param id - Prompt UUID
   * @returns /edit/:id with id substituted
   */
  editPrompt: (id: string): string => `/edit/${id}`,
} as const;

// ============================================================================
// URL Parameter Types
// ============================================================================

/**
 * URL parameters for prompt-related routes
 */
export type PromptRouteParams = {
  id: string; // Prompt UUID from Supabase
};

// ============================================================================
// Navigation State Types
// ============================================================================

/**
 * Location state passed during login redirect to preserve destination
 */
export type LoginLocationState = {
  from?: {
    pathname: string;
    search?: string;
  };
};

// ============================================================================
// Route Metadata
// ============================================================================

/**
 * Route metadata for each application route
 */
export interface RouteMetadata {
  path: string;
  name: string;
  protected: boolean;
  description: string;
  keyboardShortcut?: string;
}

/**
 * Complete route metadata registry
 * Useful for generating navigation menus, documentation, and shortcuts
 */
export const ROUTE_METADATA: Record<string, RouteMetadata> = {
  LOGIN: {
    path: ROUTES.LOGIN,
    name: 'Login',
    protected: false,
    description: 'Authentication page',
  },

  DASHBOARD: {
    path: ROUTES.DASHBOARD,
    name: 'Dashboard',
    protected: true,
    description: 'Main dashboard with recent prompts and quick actions',
    keyboardShortcut: 'd',
  },

  PROMPTS: {
    path: ROUTES.PROMPTS,
    name: 'Prompts',
    protected: true,
    description: 'List of all seed prompts',
    keyboardShortcut: 'p',
  },

  PROMPT_DETAIL: {
    path: ROUTES.PROMPT_DETAIL,
    name: 'Prompt Detail',
    protected: true,
    description: 'View and manage a specific prompt',
  },

  CREATE: {
    path: ROUTES.CREATE,
    name: 'Create Prompt',
    protected: true,
    description: 'Create a new seed prompt',
    keyboardShortcut: 'n',
  },

  EDIT: {
    path: ROUTES.EDIT,
    name: 'Edit Prompt',
    protected: true,
    description: 'Edit an existing seed prompt',
  },

  SETTINGS: {
    path: ROUTES.SETTINGS,
    name: 'Settings',
    protected: true,
    description: 'Application settings and configuration',
    keyboardShortcut: 's',
  },
} as const;

// ============================================================================
// Route Guards
// ============================================================================

/**
 * List of routes that require authentication
 */
export const PROTECTED_ROUTES = Object.values(ROUTE_METADATA)
  .filter((route) => route.protected)
  .map((route) => route.path);

/**
 * List of routes that are publicly accessible
 */
export const PUBLIC_ROUTES = Object.values(ROUTE_METADATA)
  .filter((route) => !route.protected)
  .map((route) => route.path);

// ============================================================================
// Navigation Contracts
// ============================================================================

/**
 * Navigation actions that can be performed
 */
export type NavigationAction =
  | { type: 'NAVIGATE'; path: string; replace?: boolean }
  | { type: 'NAVIGATE_PROMPT_DETAIL'; promptId: string }
  | { type: 'NAVIGATE_EDIT_PROMPT'; promptId: string }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'REDIRECT_LOGIN'; from?: string };

// ============================================================================
// Error Page Contracts
// ============================================================================

/**
 * Error types for the ErrorPage component
 */
export type ErrorPageType = 'not-found' | 'unauthorized' | 'generic';

/**
 * Error page configuration
 */
export interface ErrorPageConfig {
  type: ErrorPageType;
  message?: string;
  returnPath?: string; // Default: /dashboard
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Using route constants
 *
 * ```typescript
 * import { ROUTES, buildRoute } from '@/specs/002-page-routing/contracts/routes';
 * import { Link } from 'react-router-dom';
 *
 * // Static route
 * <Link to={ROUTES.DASHBOARD}>Dashboard</Link>
 *
 * // Parameterized route
 * <Link to={buildRoute.promptDetail('abc-123')}>View Prompt</Link>
 * ```
 */

/**
 * Example: Type-safe URL parameters
 *
 * ```typescript
 * import { useParams } from 'react-router-dom';
 * import type { PromptRouteParams } from '@/specs/002-page-routing/contracts/routes';
 *
 * function PromptDetail() {
 *   const { id } = useParams<PromptRouteParams>();
 *   // id is type-safe as string
 * }
 * ```
 */

/**
 * Example: Login redirect with state
 *
 * ```typescript
 * import { useNavigate, useLocation } from 'react-router-dom';
 * import { ROUTES, type LoginLocationState } from '@/specs/002-page-routing/contracts/routes';
 *
 * // Redirect to login
 * navigate(ROUTES.LOGIN, {
 *   state: { from: location } as LoginLocationState
 * });
 *
 * // After login
 * const location = useLocation();
 * const from = (location.state as LoginLocationState)?.from?.pathname || ROUTES.DASHBOARD;
 * navigate(from, { replace: true });
 * ```
 */

// ============================================================================
// Integration Points
// ============================================================================

/**
 * Integration with keyboard shortcuts (useKeyboardShortcuts.ts)
 *
 * Keyboard shortcuts should use:
 * - ROUTES constants for navigation targets
 * - buildRoute functions for parameterized navigation
 * - useNavigate hook for programmatic navigation
 */

/**
 * Integration with Sidebar component
 *
 * Sidebar should use:
 * - Link component with ROUTES constants
 * - useLocation hook to determine active route
 * - ROUTE_METADATA for display names and shortcuts
 */

/**
 * Integration with Auth (authStore)
 *
 * Auth integration points:
 * - ProtectedRoute uses useAuthStore() to check authentication
 * - Login page uses navigate() to redirect after auth
 * - LoginLocationState preserves attempted route
 */

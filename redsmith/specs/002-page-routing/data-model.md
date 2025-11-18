# Data Model: Page Routing

**Feature**: Proper Page Routing
**Date**: 2025-11-17
**Status**: Complete

## Overview

This document defines the data structures and types needed to implement React Router 7 in the redsmith application. Since routing is primarily infrastructure, this focuses on route configuration, navigation state, and TypeScript types rather than database entities.

---

## Route Configuration Types

### Route Definition
Represents a single route in the application.

```typescript
interface RouteConfig {
  path: string;              // URL path pattern (e.g., "/prompt/:id")
  element: React.ReactNode;  // Component to render
  protected: boolean;        // Whether route requires authentication
}
```

**Example**:
```typescript
{
  path: "/dashboard",
  element: <Dashboard />,
  protected: true
}
```

---

## Navigation State Types

### URL Parameters
Type-safe URL parameter extraction for parameterized routes.

```typescript
// Prompt detail/edit routes
type PromptRouteParams = {
  id: string;  // Prompt UUID from Supabase
}

// Currently only prompt-based routes use parameters
// Future routes can extend this pattern
```

**Usage**:
```typescript
// In PromptDetail.tsx
import { useParams } from 'react-router-dom';

const { id } = useParams<PromptRouteParams>();
// id is type-safe as string
```

---

### Location State
State passed during navigation for preserving context.

```typescript
// Login redirect state
type LoginLocationState = {
  from?: {
    pathname: string;
    search?: string;
  };
}
```

**Example**:
```typescript
// When redirecting to login
navigate('/login', {
  state: { from: location } as LoginLocationState
});

// After login
const location = useLocation();
const from = (location.state as LoginLocationState)?.from?.pathname || '/dashboard';
navigate(from, { replace: true });
```

---

## Page Identifier Mapping

Maps the old state-based navigation to new URL paths.

### Migration Table

| Old Page Identifier | New Route Path | URL Parameters | Notes |
|---------------------|----------------|----------------|-------|
| `dashboard` | `/dashboard` | None | Landing page for authenticated users |
| `prompts` | `/prompts` | None | List all prompts |
| `search` | `/prompts` | None | Search merged into prompts list |
| `detail` | `/prompt/:id` | `id` (UUID) | View single prompt |
| `create` | `/create` | None | Create new prompt |
| `edit` | `/edit/:id` | `id` (UUID) | Edit existing prompt |
| `settings` | `/settings` | None | User settings page |
| `login` | `/login` | None | Public auth page |
| (none) | `/` | None | Root redirects to `/dashboard` |
| (none) | `*` | None | 404 catch-all |

---

## Route Structure

### Application Route Tree

```
/ (root)
├── /login (public)
│   └── LoginPage component
│
├── Protected Routes (require auth)
│   ├── / (redirect to /dashboard)
│   ├── /dashboard
│   │   └── Dashboard component
│   ├── /prompts
│   │   └── PromptList component
│   ├── /prompt/:id
│   │   └── PromptDetail component
│   ├── /create
│   │   └── CreateEditPrompt component (mode: create)
│   ├── /edit/:id
│   │   └── CreateEditPrompt component (mode: edit)
│   └── /settings
│       └── Settings component
│
└── /* (catch-all)
    └── ErrorPage component (404)
```

---

## Component Interface Changes

### Before: State-based Navigation

```typescript
// Old component interfaces with navigation callbacks
interface DashboardProps {
  onNavigate: (page: string, promptId?: string) => void;
}

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string, promptId?: string) => void;
}
```

### After: Router-based Navigation

```typescript
// New component interfaces - no navigation props needed
interface DashboardProps {
  // Props removed - components use useNavigate hook directly
}

interface SidebarProps {
  // currentPage determined by useLocation hook
  // No onNavigate prop - uses Link components
}
```

**Migration Impact**:
- Remove `onNavigate` prop from all page components
- Remove `currentPage` prop from Sidebar (use `useLocation` instead)
- Components use `useNavigate()` hook for programmatic navigation
- Components use `<Link>` for declarative navigation

---

## Authentication State (Unchanged)

The existing Zustand auth store remains unchanged. Routes integrate with existing auth state.

```typescript
// Existing authStore interface (no changes)
interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Usage in ProtectedRoute**:
```typescript
const { user, loading } = useAuthStore();

if (loading) return <AppLoadingSkeleton />;
if (!user) return <Navigate to="/login" />;
return <Outlet />;
```

---

## Error States

### Error Page Props

```typescript
interface ErrorPageProps {
  type?: 'not-found' | 'unauthorized' | 'generic';
  message?: string;
}
```

**Error Types**:
- **not-found** (404): Invalid route path
- **unauthorized** (403): Missing permissions (handled in page components)
- **generic** (500): Unexpected errors (handled by ErrorBoundary)

**Example**:
```tsx
// 404 - Invalid route
<Route path="*" element={<ErrorPage type="not-found" />} />

// Unauthorized - In PromptDetail when user can't access
if (!canAccess) {
  return <ErrorPage type="unauthorized" message="You don't have permission to view this prompt." />
}
```

---

## Validation Rules

### Route Parameters

**Prompt ID Validation**:
- Format: UUID v4 (from Supabase)
- Pattern: `[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`
- Validation: Performed in page components after parameter extraction
- Invalid ID handling: Show ErrorPage with "Prompt not found" message

```typescript
// In PromptDetail.tsx
const { id } = useParams<PromptRouteParams>();

// Validate ID exists in database
const { data: prompt, error } = await supabase
  .from('prompts')
  .select('*')
  .eq('id', id)
  .single();

if (error || !prompt) {
  return <ErrorPage type="not-found" message="Prompt not found" />;
}
```

---

## State Transitions

### Navigation Flow States

```typescript
type NavigationState =
  | 'idle'           // No navigation in progress
  | 'loading'        // Route transition in progress
  | 'error';         // Navigation failed

// React Router handles these states internally
// Loading state visible via Suspense boundaries (if added later)
```

### Authentication Flow

```
Unauthenticated User → Protected Route
  ↓
ProtectedRoute checks auth
  ↓
Redirect to /login with location state
  ↓
User logs in successfully
  ↓
Redirect to original location (or /dashboard if none)
  ↓
User accesses protected route
```

---

## Browser History Integration

React Router's BrowserRouter automatically manages:
- **History stack**: Push new entries on navigation
- **Back/forward**: Browser buttons work automatically
- **URL updates**: Synchronous with navigation
- **Page refresh**: URL preserved, route re-matched on mount

**No custom history management needed** - BrowserRouter provides complete browser history integration out of the box.

---

## Performance Considerations

### Route Matching
- React Router 7 uses path-to-regexp for efficient route matching
- Route order matters for catch-all routes (place `*` last)
- No performance impact expected with 10 routes

### Bundle Size
- react-router-dom@7.9.6: ~30KB gzipped
- No code splitting needed at this stage (all routes eagerly loaded)
- Future optimization: Route-based code splitting (out of current scope)

---

## Summary

### New Types Required
1. `PromptRouteParams` - Type-safe URL parameters
2. `LoginLocationState` - Login redirect state
3. `ErrorPageProps` - Error page configuration

### Removed Types
1. `NavigationState` - Old state-based navigation removed
2. `Page` type union - No longer needed

### Unchanged
1. Supabase entities (prompts, users, etc.)
2. Zustand store interfaces
3. Component prop interfaces (except navigation removal)

### Key Relationships
- Routes → Page Components (1:1 mapping)
- ProtectedRoute → AuthStore (integration point)
- URL Parameters → Supabase IDs (validation in components)

# Research: React Router 7 Integration

**Feature**: Proper Page Routing
**Date**: 2025-11-17
**Status**: Complete

## Research Questions Resolved

This document captures all research findings needed to implement React Router 7 in the redsmith application.

---

## 1. React Router 7 Installation & Setup

### Decision: Use react-router-dom package
**Rationale**: While React Router 7 unified into a single `react-router` package, `react-router-dom` re-exports everything for web applications and provides a smooth upgrade path from v6 applications.

**Installation**:
```bash
pnpm add react-router-dom@latest
```

**Version**: 7.9.6 (latest as of 2025-11-17)

**Alternatives considered**:
- Using `react-router` directly: Rejected because `react-router-dom` is the conventional web package and provides web-specific types
- Using `create-react-router` template: Rejected because we have an existing Vite + React 19 project

**Sources**:
- https://reactrouter.com/
- https://www.npmjs.com/package/react-router-dom

---

## 2. React Router 7 + Vite Integration

### Decision: Use standard BrowserRouter setup (no Vite plugin)
**Rationale**: React Router 7's Vite plugin enables SSR, RSC, and static pre-rendering features that are out of scope for this hackathon project. The standard client-side routing approach is simpler and meets all requirements.

**Setup Pattern**:
```tsx
// main.tsx
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

**Alternatives considered**:
- React Router Vite plugin with SSR: Rejected as over-engineering for hackathon scope (violates MVP Speed principle)
- HashRouter: Rejected because BrowserRouter provides cleaner URLs and better UX

**Compatibility**: React Router 7 works with React 18 and React 19, Vite 5+, Node 20+. Our stack (React 19.2.0, Vite 7.2.2, Node 18+) is fully compatible.

**Sources**:
- https://reactrouter.com/start/declarative/installation
- https://dev.to/seyedahmaddv/react-19-react-router-v7-a-modern-approach-to-building-react-apps-2dmk

---

## 3. Route Definitions & Navigation Patterns

### Decision: Use declarative route configuration with nested Routes
**Rationale**: Declarative routes in React Router 7 map naturally to our existing page structure and provide clear URL-to-component mapping.

**Route Configuration**:
```tsx
// src/routes/index.tsx
import { Routes, Route } from 'react-router-dom'

<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/prompts" element={<PromptList />} />
    <Route path="/prompt/:id" element={<PromptDetail />} />
    <Route path="/create" element={<CreateEditPrompt />} />
    <Route path="/edit/:id" element={<CreateEditPrompt />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
  <Route path="*" element={<ErrorPage />} />
</Routes>
```

**Navigation Hooks**:
- `useNavigate()`: For programmatic navigation (replaces handleNavigate callbacks)
- `useParams()`: For accessing URL parameters (e.g., prompt ID)
- `useLocation()`: For accessing current location/pathname

**Link Component**:
```tsx
import { Link } from 'react-router-dom'
<Link to="/dashboard">Dashboard</Link>
```

**Alternatives considered**:
- Data router API (createBrowserRouter): Rejected because it's more verbose and we don't need server-side data loading
- Route objects array: Rejected in favor of JSX for better readability

**Sources**:
- https://reactrouter.com/home
- https://www.robinwieruch.de/react-router/

---

## 4. Protected Routes Pattern

### Decision: Use Outlet-based ProtectedRoute component with AuthContext
**Rationale**: Using React Router's `Outlet` component creates a Layout Route that wraps all protected pages, providing clean authorization at the route level.

**Implementation Pattern**:
```tsx
// src/routes/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const { user, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return <AppLoadingSkeleton />
  }

  if (!user) {
    // Redirect to login, preserving the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
```

**Smart Redirect After Login**:
```tsx
// In LoginPage after successful auth
const location = useLocation()
const navigate = useNavigate()

const from = location.state?.from?.pathname || '/dashboard'
navigate(from, { replace: true })
```

**Alternatives considered**:
- Higher-order component (HOC) pattern: Rejected because Outlet pattern is more idiomatic in React Router 7
- Middleware API (React Router 7.9+): Rejected as experimental feature (requires future.v8_middleware flag)
- Checking auth in each page component: Rejected due to code duplication

**Sources**:
- https://dev.to/ra1nbow1/building-reliable-protected-routes-with-react-router-v7-1ka0
- https://www.robinwieruch.de/react-router-private-routes/
- https://medium.com/@sustiono19/how-to-create-a-protected-route-in-react-with-react-router-dom-v7-6680dae765fb

---

## 5. Error Handling & 404 Pages

### Decision: Use catch-all route with custom ErrorPage component
**Rationale**: Provides user-friendly error handling for invalid routes while allowing navigation back to the application.

**Pattern**:
```tsx
// 404 catch-all route
<Route path="*" element={<ErrorPage />} />

// ErrorPage component
export function ErrorPage() {
  return (
    <div className="error-page">
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/dashboard">Return to Dashboard</Link>
    </div>
  )
}
```

**Error Scenarios**:
- **Invalid routes**: Caught by `<Route path="*">`
- **Invalid resource IDs**: Handled in page components (e.g., prompt not found)
- **Permission failures**: Handled in page components with error UI

**Alternatives considered**:
- React Router's errorElement prop: Rejected because it's designed for loader/action errors (not needed for client-side-only routing)
- Using existing ErrorBoundary: Kept for runtime errors, but 404s handled separately

**Sources**:
- https://reactrouter.com/home
- Spec requirements (FR-006, FR-007, FR-015)

---

## 6. Integration with Existing Navigation Patterns

### Decision: Replace handleNavigate callbacks with useNavigate hook
**Rationale**: React Router's `useNavigate` provides the same programmatic navigation functionality while updating URLs and browser history.

**Migration Pattern**:

**Before** (state-based navigation):
```tsx
// App.tsx
const handleNavigate = (page: string, promptId?: string) => {
  setNavigation({ page: page as Page, promptId })
}

// Sidebar.tsx
<button onClick={() => onNavigate('dashboard')}>Dashboard</button>

// Keyboard shortcuts
handler: () => handleNavigate('dashboard')
```

**After** (router-based navigation):
```tsx
// App.tsx - no handleNavigate needed

// Sidebar.tsx
import { Link } from 'react-router-dom'
<Link to="/dashboard">Dashboard</Link>

// OR for programmatic navigation
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
<button onClick={() => navigate('/dashboard')}>Dashboard</button>

// Keyboard shortcuts
import { useNavigate } from 'react-router-dom'
const navigate = useNavigate()
handler: () => navigate('/dashboard')
```

**Alternatives considered**:
- Keeping dual navigation systems: Rejected to avoid confusion and bugs
- Gradual migration: Rejected because the change is localized and straightforward

**Sources**:
- https://reactrouter.com/home
- Existing codebase analysis (App.tsx, Sidebar.tsx, useKeyboardShortcuts.ts)

---

## 7. Browser History & URL Parameters

### Decision: Use standard React Router history management (no custom config needed)
**Rationale**: BrowserRouter handles browser history automatically. URL parameters accessed via `useParams()` hook.

**URL Parameter Pattern**:
```tsx
// Route definition
<Route path="/prompt/:id" element={<PromptDetail />} />

// In component
import { useParams } from 'react-router-dom'

function PromptDetail() {
  const { id } = useParams()
  // id contains the prompt ID from the URL
}
```

**Browser History**:
- Back/forward buttons: Handled automatically by BrowserRouter
- Programmatic history: `navigate(-1)` for back, `navigate(1)` for forward
- Replace vs push: `navigate('/path', { replace: true })` to replace instead of push

**Alternatives considered**:
- Manual history management: Not needed, BrowserRouter handles this
- Query parameters for IDs: Rejected because path parameters are more RESTful

**Sources**:
- https://reactrouter.com/home
- Spec requirements (FR-004, FR-005)

---

## Summary of Technical Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| **Package** | react-router-dom@latest (7.9.6) | Web-optimized, smooth v6 upgrade path |
| **Router Type** | BrowserRouter (client-side only) | Clean URLs, meets all requirements, no SSR overhead |
| **Route Config** | Declarative JSX Routes | Readable, maps to existing pages, no config complexity |
| **Protected Routes** | Outlet-based ProtectedRoute | Clean layout pattern, smart redirects, no duplication |
| **Navigation** | useNavigate hook + Link component | Drop-in replacement for handleNavigate, type-safe |
| **Error Handling** | Catch-all route + ErrorPage | User-friendly 404s with navigation back |
| **URL Parameters** | useParams hook | Standard React Router pattern, clean API |

---

## Implementation Notes

### Files to Create
- `src/routes/index.tsx` - Route definitions
- `src/routes/ProtectedRoute.tsx` - Auth guard
- `src/routes/ErrorPage.tsx` - 404 and error pages

### Files to Update
- `src/main.tsx` - Wrap app in BrowserRouter
- `src/App.tsx` - Replace navigation state with Routes
- `src/components/Sidebar.tsx` - Use Link components
- `src/hooks/useKeyboardShortcuts.ts` - Use useNavigate hook
- `src/pages/*.tsx` - Update to use useNavigate instead of onNavigate prop

### No Changes Needed
- Page components (Dashboard, PromptList, etc.) - just remove onNavigate prop
- Zustand stores - state management unchanged
- Supabase integration - auth flow unchanged
- Existing ErrorBoundary - keeps handling runtime errors

---

## Alignment with Constitution

✅ **MVP Speed**: Standard React Router setup, no custom abstractions, well-documented patterns
✅ **Simple But Scalable**: Single dependency, zero config, works locally and in production
✅ **Demo-First Quality**: Infrastructure change, no visible UI changes, error handling for obvious failures

**Risk Assessment**: LOW - React Router 7 is stable, well-documented, and a standard choice for React SPAs. No experimental features used.

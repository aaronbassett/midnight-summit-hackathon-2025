# Quickstart: Implementing Page Routing

**Feature**: Proper Page Routing
**Date**: 2025-11-17
**Estimated Time**: 2-3 hours

This quickstart guide provides the implementation checklist for adding React Router 7 to the redsmith application.

---

## Prerequisites

✅ Research completed (research.md)
✅ Data model defined (data-model.md)
✅ Route contracts defined (contracts/routes.ts)
✅ Constitution gates passed

---

## Implementation Checklist

### Phase 1: Install Dependencies (5 min)

- [ ] Install react-router-dom
  ```bash
  pnpm add react-router-dom@latest
  ```
- [ ] Verify installation
  ```bash
  pnpm list react-router-dom
  # Should show 7.9.6 or later
  ```

### Phase 2: Create Route Infrastructure (30 min)

- [ ] Create `src/routes/` directory
  ```bash
  mkdir -p src/routes
  ```

- [ ] Create `src/routes/ErrorPage.tsx`
  - Component for 404 and error states
  - Props: `type`, `message`
  - UI: Error message + "Return to Dashboard" button
  - Use existing Tailwind styles (dark theme)

- [ ] Create `src/routes/ProtectedRoute.tsx`
  - Use `Outlet` component from react-router-dom
  - Import `useAuthStore` for auth check
  - Show `AppLoadingSkeleton` while loading
  - Redirect to `/login` with location state if not authenticated
  - Return `<Outlet />` if authenticated

- [ ] Create `src/routes/index.tsx`
  - Import all page components
  - Define `<Routes>` structure (see data-model.md route tree)
  - Use `ProtectedRoute` as layout route
  - Add catch-all `*` route for 404

### Phase 3: Update Application Entry (15 min)

- [ ] Update `src/main.tsx`
  - Import `BrowserRouter` from react-router-dom
  - Wrap `<App />` in `<BrowserRouter>`
  - Keep existing `<React.StrictMode>`

- [ ] Update `src/App.tsx`
  - Remove `useState<NavigationState>`
  - Remove `handleNavigate` function
  - Remove `Page` type and navigation state logic
  - Import `Routes` component from `src/routes/`
  - Replace page conditionals with `<Routes />` component
  - Keep existing error boundaries
  - Keep `ToastContainer` and `KeyboardShortcutsHelp`
  - Update keyboard shortcuts to use `useNavigate` (see Phase 4)

### Phase 4: Update Keyboard Shortcuts (15 min)

- [ ] Update keyboard shortcuts in `App.tsx`
  - Import `useNavigate` from react-router-dom
  - Call `const navigate = useNavigate()`
  - Update handler functions to use `navigate(ROUTES.DASHBOARD)` etc.
  - Import `ROUTES` from contracts/routes.ts

- [ ] Update `src/hooks/useKeyboardShortcuts.ts` if needed
  - No changes needed if handlers are passed from App.tsx
  - If hook needs updating, use same pattern with useNavigate

### Phase 5: Update Sidebar Navigation (20 min)

- [ ] Update `src/components/Sidebar.tsx`
  - Remove `onNavigate` and `currentPage` props
  - Import `Link` and `useLocation` from react-router-dom
  - Import `ROUTES` from contracts/routes.ts
  - Replace button onClick with `<Link to={ROUTES.DASHBOARD}>` etc.
  - Use `useLocation()` to determine active route
  - Update active state styling to check `location.pathname === ROUTES.DASHBOARD`

### Phase 6: Update Page Components (30 min)

- [ ] Remove `onNavigate` prop from all pages:
  - `src/pages/Dashboard.tsx`
  - `src/pages/PromptList.tsx`
  - `src/pages/PromptDetail.tsx`
  - `src/pages/CreateEditPrompt.tsx`
  - `src/pages/Settings.tsx`

- [ ] Update programmatic navigation in pages:
  - Import `useNavigate` from react-router-dom
  - Import `buildRoute` from contracts/routes.ts
  - Replace `onNavigate('detail', promptId)` with `navigate(buildRoute.promptDetail(promptId))`
  - Replace `onNavigate('dashboard')` with `navigate(ROUTES.DASHBOARD)`

- [ ] Update `PromptDetail.tsx` and `CreateEditPrompt.tsx`:
  - Import `useParams` from react-router-dom
  - Import `PromptRouteParams` from contracts/routes.ts
  - Get `id` from `useParams<PromptRouteParams>()`
  - Remove `promptId` prop

### Phase 7: Update Login Flow (15 min)

- [ ] Update `src/pages/LoginPage.tsx`
  - Import `useNavigate`, `useLocation` from react-router-dom
  - Import `LoginLocationState`, `ROUTES` from contracts/routes.ts
  - After successful login:
    ```tsx
    const from = (location.state as LoginLocationState)?.from?.pathname || ROUTES.DASHBOARD;
    navigate(from, { replace: true });
    ```

### Phase 8: Error Handling (15 min)

- [ ] Add error handling in `PromptDetail.tsx`
  - If prompt ID is invalid or not found, show `<ErrorPage type="not-found" />`

- [ ] Add error handling in `CreateEditPrompt.tsx` (edit mode)
  - If prompt ID is invalid or not found, show `<ErrorPage type="not-found" />`

- [ ] Test 404 behavior
  - Navigate to `/invalid-route` → should show ErrorPage
  - Navigate to `/prompt/invalid-id` → should show ErrorPage

### Phase 9: Testing & Validation (30 min)

- [ ] Manual testing checklist:
  - [ ] Direct URL navigation works (enter `/dashboard` in address bar)
  - [ ] Browser back button works after navigation
  - [ ] Browser forward button works after going back
  - [ ] Page refresh preserves location
  - [ ] Keyboard shortcuts update URL and work with back button
  - [ ] Sidebar links navigate correctly
  - [ ] Clicking prompts in dashboard navigates to detail page
  - [ ] Login redirect preserves destination URL
  - [ ] Invalid routes show 404 error page
  - [ ] Invalid prompt IDs show error page
  - [ ] "Return to Dashboard" button works from error pages

- [ ] Run linting
  ```bash
  pnpm run lint
  ```

- [ ] Run type checking
  ```bash
  pnpm run typecheck
  ```

- [ ] Run tests (if any exist)
  ```bash
  pnpm run test
  ```

### Phase 10: Documentation & Cleanup (10 min)

- [ ] Update README.md with route structure (if needed)
- [ ] Add code comments for non-obvious route configurations
- [ ] Remove unused imports and old navigation code
- [ ] Commit changes with clear message
  ```bash
  git add .
  git commit -m "feat: implement React Router 7 for proper page routing"
  ```

---

## Quick Reference Commands

```bash
# Install dependency
pnpm add react-router-dom@latest

# Run dev server
pnpm run dev

# Run full CI suite
pnpm run ci

# Type check only
pnpm run typecheck

# Lint only
pnpm run lint
```

---

## Migration Patterns Reference

### Before: State-based Navigation
```tsx
// App.tsx
const [navigation, setNavigation] = useState({ page: 'dashboard' });
const handleNavigate = (page: string, promptId?: string) => {
  setNavigation({ page: page as Page, promptId });
};

// In components
<button onClick={() => onNavigate('dashboard')}>Dashboard</button>
```

### After: Router-based Navigation
```tsx
// App.tsx
import { Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// In components
import { Link } from 'react-router-dom';
<Link to={ROUTES.DASHBOARD}>Dashboard</Link>

// Programmatic
navigate(ROUTES.DASHBOARD);
navigate(buildRoute.promptDetail(promptId));
```

---

## Troubleshooting

### Issue: "Routes not updating"
**Solution**: Ensure `<BrowserRouter>` wraps the entire `<App />` in main.tsx

### Issue: "useNavigate() is undefined"
**Solution**: Component must be inside `<BrowserRouter>` context

### Issue: "Page refreshes redirect to dashboard"
**Solution**: Check that route paths match URL exactly (case-sensitive)

### Issue: "Back button doesn't work"
**Solution**: Use `navigate()` instead of `navigate(path, { replace: true })` for normal navigation

### Issue: "Login redirect loses destination"
**Solution**: Ensure `location.state` is passed correctly in Navigate component

---

## Success Criteria Validation

After implementation, verify:

✅ **SC-001**: Can navigate to `/dashboard`, `/prompts`, `/prompt/123` directly in address bar
✅ **SC-002**: Back/forward buttons navigate through history correctly
✅ **SC-003**: Page refresh preserves current route
✅ **SC-004**: Keyboard shortcuts (d, p, s, n) still work and update URL
✅ **SC-005**: Sharing URL with another user loads correct page
✅ **SC-006**: Invalid routes show error page within 1 second
✅ **SC-007**: Login redirects to originally requested page
✅ **SC-008**: Route transitions complete within 250ms

---

## Next Steps After Implementation

After routing is complete:
1. Run `/speckit.tasks` to generate tasks.md for implementation
2. Follow tasks.md for step-by-step implementation
3. Update CLAUDE.md with React Router 7 technology (done automatically by update-agent-context.sh)

---

## Time Estimates

- **Setup & Infrastructure**: 50 minutes
- **Component Updates**: 65 minutes
- **Testing**: 30 minutes
- **Documentation**: 10 minutes
- **Buffer**: 15 minutes

**Total**: ~2.5 hours

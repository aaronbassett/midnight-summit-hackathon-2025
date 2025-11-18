# Tasks: Proper Page Routing

**Branch**: `002-page-routing`
**Feature**: Implement React Router 7 for URL-based navigation
**Input**: Design documents from `/specs/002-page-routing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/routes.ts, quickstart.md

**Tests**: Tests are NOT included in this feature (manual testing only per spec requirements)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install React Router 7 and create basic route infrastructure

- [ ] T001 Install react-router-dom@latest via pnpm add react-router-dom@latest
- [ ] T002 Create src/routes/ directory for route configuration
- [ ] T003 [P] Create src/routes/ErrorPage.tsx component with type/message props and "Return to Dashboard" button
- [ ] T004 [P] Create contracts types file at src/types/routes.ts by copying from specs/002-page-routing/contracts/routes.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core routing infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create src/routes/ProtectedRoute.tsx with Outlet-based auth guard using useAuthStore
- [ ] T006 Create src/routes/index.tsx with Routes structure including protected routes wrapper
- [ ] T007 Update src/main.tsx to wrap App in BrowserRouter from react-router-dom
- [ ] T008 Update src/App.tsx to remove NavigationState, handleNavigate callback, and Page type logic
- [ ] T009 Update src/App.tsx to replace page conditionals with Routes component from src/routes/index.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Direct URL Navigation (Priority: P1) 🎯 MVP

**Goal**: Users can access specific pages directly through URLs and share links with others

**Independent Test**: Enter different URLs in the browser address bar (e.g., `/dashboard`, `/prompts`) and verify the correct page loads without manual navigation

### Implementation for User Story 1

- [ ] T010 [P] [US1] Add root route "/" with Navigate redirect to "/dashboard" in src/routes/index.tsx
- [ ] T011 [P] [US1] Add public login route "/login" with LoginPage component in src/routes/index.tsx
- [ ] T012 [P] [US1] Add protected dashboard route "/dashboard" with Dashboard component in src/routes/index.tsx
- [ ] T013 [P] [US1] Add protected prompts route "/prompts" with PromptList component in src/routes/index.tsx
- [ ] T014 [P] [US1] Add protected prompt detail route "/prompt/:id" with PromptDetail component in src/routes/index.tsx
- [ ] T015 [P] [US1] Add protected create route "/create" with CreateEditPrompt component in src/routes/index.tsx
- [ ] T016 [P] [US1] Add protected edit route "/edit/:id" with CreateEditPrompt component in src/routes/index.tsx
- [ ] T017 [P] [US1] Add protected settings route "/settings" with Settings component in src/routes/index.tsx
- [ ] T018 [US1] Add catch-all route "*" with ErrorPage component for 404 handling in src/routes/index.tsx
- [ ] T019 [US1] Update src/pages/PromptDetail.tsx to extract id from useParams<PromptRouteParams>() instead of promptId prop
- [ ] T020 [US1] Update src/pages/CreateEditPrompt.tsx to extract id from useParams<PromptRouteParams>() for edit mode instead of promptId prop
- [ ] T021 [US1] Add error handling in src/pages/PromptDetail.tsx to show ErrorPage for invalid/missing prompt IDs
- [ ] T022 [US1] Add error handling in src/pages/CreateEditPrompt.tsx to show ErrorPage for invalid/missing prompt IDs in edit mode

**Checkpoint**: Direct URL navigation should work for all routes. Users can type URLs in the address bar and access pages directly.

---

## Phase 4: User Story 2 - Browser Navigation Controls (Priority: P1)

**Goal**: Users can use browser back and forward buttons to navigate through their browsing history

**Independent Test**: Navigate through multiple pages (Dashboard → Prompts → Prompt Detail) and use browser back/forward buttons to verify proper history management

### Implementation for User Story 2

- [ ] T023 [US2] Verify BrowserRouter in src/main.tsx automatically enables browser history (no code changes needed - validation only)
- [ ] T024 [US2] Test browser back button functionality across all navigation scenarios from spec.md (manual testing)
- [ ] T025 [US2] Test browser forward button functionality across all navigation scenarios from spec.md (manual testing)
- [ ] T026 [US2] Test that keyboard shortcuts create proper history entries for back button navigation (manual testing)

**Checkpoint**: Browser back/forward buttons should work correctly across all navigation scenarios. History stack should be maintained properly.

---

## Phase 5: User Story 3 - Page Refresh Persistence (Priority: P1)

**Goal**: Users can refresh the page without losing their current location or context

**Independent Test**: Navigate to various pages and refresh the browser to verify the page persists with the same URL and content

### Implementation for User Story 3

- [ ] T027 [US3] Verify React Router URL persistence on refresh works for all routes (manual testing)
- [ ] T028 [US3] Test prompt detail page refresh preserves prompt ID and loads correct data from src/pages/PromptDetail.tsx
- [ ] T029 [US3] Test edit page refresh preserves prompt ID and loads correct form data from src/pages/CreateEditPrompt.tsx
- [ ] T030 [US3] Test all protected routes refresh correctly without redirecting to dashboard (manual testing)

**Checkpoint**: Page refresh should preserve current location for all routes. Data should reload correctly based on URL parameters.

---

## Phase 6: User Story 4 - Keyboard Shortcut Integration (Priority: P2)

**Goal**: Existing keyboard shortcuts continue to work and integrate seamlessly with the new routing system

**Independent Test**: Use all existing keyboard shortcuts (d, p, s, n) and verify URLs update and browser history is maintained

### Implementation for User Story 4

- [ ] T031 [US4] Update keyboard shortcut handlers in src/App.tsx to use useNavigate hook instead of handleNavigate callback
- [ ] T032 [US4] Import ROUTES constants from src/types/routes.ts into src/App.tsx for keyboard shortcuts
- [ ] T033 [US4] Update 'd' keyboard shortcut handler to navigate(ROUTES.DASHBOARD) in src/App.tsx
- [ ] T034 [US4] Update 'p' keyboard shortcut handler to navigate(ROUTES.PROMPTS) in src/App.tsx
- [ ] T035 [US4] Update 's' keyboard shortcut handler to navigate(ROUTES.SETTINGS) in src/App.tsx
- [ ] T036 [US4] Update 'n' or 'c' keyboard shortcut handler to navigate(ROUTES.CREATE) in src/App.tsx
- [ ] T037 [US4] Test all keyboard shortcuts update URL correctly and create browser history entries (manual testing)

**Checkpoint**: All keyboard shortcuts should work with proper URL updates and browser history integration.

---

## Phase 7: User Story 5 - Programmatic Navigation (Priority: P2)

**Goal**: Existing programmatic navigation (onClick handlers, sidebar navigation, etc.) continues to work and uses the new routing system

**Independent Test**: Click through all existing navigation UI elements (sidebar, dashboard prompt cards, buttons) and verify routes update correctly

### Implementation for User Story 5

- [ ] T038 [US5] Update src/components/Sidebar.tsx to remove onNavigate and currentPage props from interface
- [ ] T039 [US5] Import Link and useLocation from react-router-dom in src/components/Sidebar.tsx
- [ ] T040 [US5] Import ROUTES from src/types/routes.ts in src/components/Sidebar.tsx
- [ ] T041 [US5] Replace Sidebar navigation buttons with Link components using ROUTES constants in src/components/Sidebar.tsx
- [ ] T042 [US5] Update Sidebar active state detection to use useLocation().pathname comparison in src/components/Sidebar.tsx
- [ ] T043 [US5] Update src/pages/Dashboard.tsx to import useNavigate and buildRoute for prompt navigation
- [ ] T044 [US5] Update src/pages/Dashboard.tsx to remove onNavigate prop and use navigate(buildRoute.promptDetail(promptId))
- [ ] T045 [US5] Update src/pages/PromptList.tsx to import useNavigate and buildRoute for prompt navigation
- [ ] T046 [US5] Update src/pages/PromptList.tsx to remove onNavigate prop and use navigate(buildRoute.promptDetail(promptId))
- [ ] T047 [US5] Update src/pages/CreateEditPrompt.tsx to import useNavigate and ROUTES for post-save navigation
- [ ] T048 [US5] Update src/pages/CreateEditPrompt.tsx to remove onNavigate prop and use navigate(buildRoute.promptDetail(newId)) after create
- [ ] T049 [US5] Update src/pages/Settings.tsx to remove onNavigate prop if present
- [ ] T050 [US5] Remove onNavigate prop passing from all parent components that were passing it to children

**Checkpoint**: All programmatic navigation should work through React Router. Sidebar, dashboard, and all navigation UI elements should use Link/useNavigate.

---

## Phase 8: User Story 6 - Login and Authentication Flow (Priority: P3)

**Goal**: Unauthenticated users are redirected to login, and after successful login, they are redirected to the page they were trying to access

**Independent Test**: Attempt to access protected URLs while logged out, log in, and verify redirect to original destination

### Implementation for User Story 6

- [ ] T051 [US6] Update src/routes/ProtectedRoute.tsx to save attempted location in Navigate state when redirecting to login
- [ ] T052 [US6] Update src/pages/LoginPage.tsx to import useNavigate and useLocation hooks
- [ ] T053 [US6] Update src/pages/LoginPage.tsx to import LoginLocationState and ROUTES from src/types/routes.ts
- [ ] T054 [US6] Update src/pages/LoginPage.tsx login success handler to extract from location.state and navigate to original destination or /dashboard
- [ ] T055 [US6] Test unauthenticated user accessing /prompts redirects to /login and preserves destination (manual testing)
- [ ] T056 [US6] Test successful login redirects to originally requested page (manual testing)
- [ ] T057 [US6] Test login from root URL redirects to /dashboard after authentication (manual testing)

**Checkpoint**: Authentication flow should preserve intended destination and redirect appropriately after login. Users should land on their originally requested page.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, and documentation

- [ ] T058 [P] Remove unused NavigationState type and Page type union from src/types/ or src/App.tsx if defined
- [ ] T059 [P] Remove unused handleNavigate imports and references across all components
- [ ] T060 [P] Run pnpm run lint to check for linting issues
- [ ] T061 [P] Run pnpm run typecheck to verify TypeScript type safety
- [ ] T062 Run pnpm run ci to execute full CI suite (format, lint, typecheck, test)
- [ ] T063 [P] Test all success criteria from spec.md manually (SC-001 through SC-008)
- [ ] T064 [P] Update README.md with route structure documentation if needed
- [ ] T065 Run specs/002-page-routing/quickstart.md validation checklist for final verification

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1-6 (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) after Phase 2
  - Or sequentially in priority order: US1 → US2 → US3 → US4 → US5 → US6
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Validates US1 history management
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Validates US1 URL persistence
- **User Story 4 (P2)**: Depends on US1 completion (needs routes to exist for keyboard shortcuts)
- **User Story 5 (P2)**: Depends on US1 completion (needs routes to exist for programmatic navigation)
- **User Story 6 (P3)**: Depends on US1 completion (needs routes and ProtectedRoute to exist)

### Within Each User Story

- **US1**: Route definitions [P] can be done in parallel (T010-T018) → then parameter extraction updates → then error handling
- **US2**: Pure validation tasks (manual testing only)
- **US3**: Pure validation tasks (manual testing only)
- **US4**: Keyboard shortcut updates can be done in parallel after navigate hook is imported
- **US5**: Component updates can be done in parallel by component [P] (different files)
- **US6**: Sequential - ProtectedRoute update → LoginPage updates → manual testing

### Parallel Opportunities

- **Phase 1**: T003 and T004 can run in parallel (different files)
- **Phase 3 (US1)**: T010-T018 can run in parallel (all adding routes to same file but different route definitions)
- **Phase 4 (US4)**: T033-T036 can run in parallel (different keyboard shortcut handlers in same file)
- **Phase 5 (US5)**: T038-T050 can be grouped by component - each component update can run in parallel
- **Phase 9**: T058, T059, T060, T061, T063, T064 can run in parallel (different concerns)

---

## Parallel Example: User Story 1

Since routes are all defined in the same file (src/routes/index.tsx), the route definition tasks (T010-T018) should be done sequentially or batched together. However, the page component updates can run in parallel:

```bash
# After route definitions are complete, these can run in parallel:
Task T019: Update src/pages/PromptDetail.tsx useParams
Task T020: Update src/pages/CreateEditPrompt.tsx useParams
Task T021: Add error handling in src/pages/PromptDetail.tsx
Task T022: Add error handling in src/pages/CreateEditPrompt.tsx
```

---

## Parallel Example: User Story 5

```bash
# All component updates can run in parallel (different files):
Task T038-T042: Update src/components/Sidebar.tsx (group)
Task T043-T044: Update src/pages/Dashboard.tsx (group)
Task T045-T046: Update src/pages/PromptList.tsx (group)
Task T047-T048: Update src/pages/CreateEditPrompt.tsx (group)
Task T049: Update src/pages/Settings.tsx
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only - Core Routing)

1. Complete Phase 1: Setup (install dependencies, create route infrastructure)
2. Complete Phase 2: Foundational (create ProtectedRoute, Routes component, update App.tsx)
3. Complete Phase 3: User Story 1 (direct URL navigation)
4. Complete Phase 4: User Story 2 (browser navigation - mostly validation)
5. Complete Phase 5: User Story 3 (page refresh persistence - mostly validation)
6. **STOP and VALIDATE**: Test User Stories 1-3 independently - basic routing should fully work
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Basic URL routing works
3. Add User Story 2 → Test independently → Browser controls work
4. Add User Story 3 → Test independently → Refresh persistence works
5. **MVP Complete** - Core routing functional
6. Add User Story 4 → Test independently → Keyboard shortcuts integrated
7. Add User Story 5 → Test independently → All UI navigation integrated
8. Add User Story 6 → Test independently → Auth flow with smart redirects complete
9. Polish phase → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical path)
2. Once Foundational is done and US1 routes exist:
   - Developer A: User Story 4 (keyboard shortcuts)
   - Developer B: User Story 5 (programmatic navigation)
   - Developer C: User Story 6 (auth flow)
3. Stories complete and test independently

---

## Estimated Timeline

- **Phase 1 (Setup)**: 15 minutes
- **Phase 2 (Foundational)**: 45 minutes
- **Phase 3 (US1)**: 30 minutes
- **Phase 4 (US2)**: 15 minutes (mostly validation)
- **Phase 5 (US3)**: 15 minutes (mostly validation)
- **Phase 6 (US4)**: 20 minutes
- **Phase 7 (US5)**: 35 minutes
- **Phase 8 (US6)**: 20 minutes
- **Phase 9 (Polish)**: 25 minutes

**Total**: ~3.5 hours (including manual testing time)

---

## Notes

- [P] tasks = different files or independent changes, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable
- Manual testing is the primary validation method per spec requirements (no automated test suite)
- Commit after each user story phase completion for clean git history
- Use ROUTES constants and buildRoute functions from src/types/routes.ts for type safety
- All route paths must match exactly (case-sensitive)
- Use navigate() for normal navigation, navigate(path, { replace: true }) only for redirects that shouldn't create history entries

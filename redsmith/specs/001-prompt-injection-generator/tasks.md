# Tasks: Prompt Injection Test Case Generator

**Implementation Framework**: Vite + React (instead of Next.js as originally planned)
**State Management**: Zustand (instead of React Context)
**Database**: Supabase PostgreSQL with RLS
**Updated**: 2025-11-14

## Implementation Status

### ✅ Completed Tasks

**Framework & Setup**
- [X] Create Vite + React + TypeScript project
- [X] Install primary dependencies: React 18+, TailwindCSS, lucide-react
- [X] Install Supabase dependencies: @supabase/supabase-js
- [X] Install LLM SDKs: openai, @anthropic-ai/sdk, @google/generative-ai
- [X] Install form dependencies: react-hook-form, @hookform/resolvers, zod
- [X] Install Zustand for state management
- [X] Create .env.example with Supabase environment variables
- [X] Create .env.local for local development
- [X] Update .gitignore for Supabase and environment files
- [X] Create project structure: src/components/, src/lib/, src/pages/, src/stores/, supabase/

**Database & Migrations**
- [X] Create database migration: 20251114000001_create_seed_prompts.sql
- [X] Create database migration: 20251114000002_create_generated_variations.sql
- [X] Create database migration: 20251114000003_create_mutated_variations.sql
- [X] Create database migration: 20251114000004_create_generation_jobs.sql
- [X] Create database migration: 20251114000005_create_llm_configs.sql
- [X] Configure RLS policies (all authenticated users can view/edit all data)
- [X] Create TypeScript types for database schema in src/lib/supabase/types.ts

**Zustand State Management**
- [X] Create authStore.ts - Authentication state and actions
- [X] Create seedPromptsStore.ts - Seed prompt CRUD operations
- [X] Create generationStore.ts - Generation job management
- [X] Create mutationsStore.ts - Mutation application
- [X] Create dashboardStore.ts - Dashboard statistics

**Supabase Integration**
- [X] Create Supabase browser client in src/lib/supabase/client.ts
- [X] Implement authentication utilities (signIn, signOut, session management)
- [X] Implement seed prompt CRUD operations
- [X] Implement dashboard statistics queries

**Authentication & Routing**
- [X] Create LoginPage component (email/password, no registration)
- [X] Update App.tsx with authentication routing
- [X] Add authentication state checks
- [X] Add logout functionality to Sidebar

**UI Components - Refactored for Zustand + Supabase**
- [X] Refactor Sidebar.tsx - Added logout and user email display
- [X] Refactor Dashboard.tsx - Connected to dashboardStore and seedPromptsStore
- [X] Refactor PromptList.tsx - Connected to seedPromptsStore with search/filter
- [X] Refactor CreateEditPrompt.tsx - Full CRUD with Supabase integration

**Utilities & Libraries**
- [X] Create mutation engine in src/lib/mutations/engine.ts
  - Character substitution (leet speak)
  - Base64 encoding
  - Hex encoding
  - Random case
  - Alternating case
  - Whitespace injection

**Documentation**
- [X] Create comprehensive README.md with setup instructions
- [X] Document Supabase configuration steps
- [X] Document user creation process
- [X] Document troubleshooting guide

---

### ✅ Recently Completed (2025-11-14 Implementation Session)

**Project Setup & Documentation**
- [X] Update .gitignore for Supabase and environment files
- [X] Create .eslintignore with proper patterns
- [X] Update plan.md to reflect Vite + Zustand architecture
- [X] Update contracts/api-contracts.md for Edge Functions

**Supabase Edge Function (Secure LLM Integration)**
- [X] Create supabase/functions/generate-variation/index.ts
- [X] Implement OpenAI integration in Edge Function
- [X] Implement Anthropic integration in Edge Function
- [X] Implement Gemini integration in Edge Function
- [X] Add authentication and error handling
- [X] Store API keys in Supabase secrets (server-side)

**Client-Side LLM Integration**
- [X] Create src/lib/llm/types.ts - Type definitions
- [X] Create src/lib/llm/generator.ts - Edge Function client wrapper
- [X] Create src/lib/utils/retry.ts - Exponential backoff utility
- [X] Handle rate limits (429 errors) via retry logic
- [X] Handle content policy refusals in Edge Function

**State Management**
- [X] Enhance generationStore with Edge Function integration
- [X] Add executeGeneration() method with retry logic
- [X] Add cancelGeneration() method for job interruption
- [X] Implement incremental saves during generation
- [X] Add job cancellation functionality
- [X] Create settingsStore for LLM provider configs

**UI Components**
- [X] Implement PromptDetail.tsx with real data integration
- [X] Implement Settings.tsx with provider configuration
- [X] Create GenerationConfigForm.tsx - Configure and start generation
- [X] Create JobProgress.tsx - Real-time job progress display
- [X] Create VariationCard.tsx - Display generated variations
- [X] Create ToastContainer.tsx for notifications
- [X] Integrate toast system in App.tsx

**Real-time Features**
- [X] Implement real-time job progress updates via Supabase Realtime (in JobProgress component)
- [X] Add Supabase Realtime subscription in generationStore

**LLM Provider Configuration (Completed)**
- [X] Implement LLM provider CRUD in Settings page (enable/disable, model selection)
- [X] API keys stored in Supabase secrets (server-side secure storage)
- [X] Filter generation UI by enabled providers (GenerationConfigForm)
- [X] Custom system prompt templates (optional field in GenerationConfigForm)

**Polish & UX Enhancements (Completed)**
- [X] Add toast notifications for user feedback (ToastContainer + toast utility)
- [X] Add empty states with helpful messages (PromptDetail, Settings)
- [X] Add confirmation dialogs for destructive actions (delete, cancel job)

---

### ✅ Mutation UI (Completed 2025-11-14)

**Mutation UI Components**
- [X] Create mutation UI components:
  - [X] MutationSelector.tsx
  - [X] MutatedVariationCard.tsx
  - [X] ApplyMutationsDialog.tsx

**Mutation Application**
- [X] Integrate mutation engine with UI
- [X] Implement bulk mutation application
- [X] Add mutation preview functionality
- [X] Add side-by-side comparison view (optional toggle)

### ✅ LLM Provider Connection Testing (Completed 2025-11-14)

**API Key Validation**
- [X] Create Supabase Edge Function for API key validation (validate-api-key)
- [X] Implement OpenAI model fetching for validation
- [X] Implement Anthropic API testing for validation
- [X] Implement Gemini model fetching for validation
- [X] Create client-side validation utilities (src/lib/llm/validation.ts)
- [X] Update settingsStore with proper testConnection implementation
- [X] Add "Test Connection" button to Settings page for each provider
- [X] Display validation results (success/error messages)
- [X] Show available models count after successful validation
- [X] Populate model dropdown with fetched models when available

### ✅ Export Functionality (Completed 2025-11-14)

**Export Utilities**
- [X] Create CSV export utility for seed prompts
- [X] Create CSV export utility for variations
- [X] Create CSV export utility for mutations
- [X] Create CSV export for complete datasets (seeds + variations + mutations)
- [X] Create JSON export utility for seed prompts
- [X] Create JSON export for complete datasets (nested structure)
- [X] Create JSON export for single prompt with all data
- [X] Create CSV export for single prompt with all data

**UI Integration**
- [X] Add export dropdown to PromptList page (CSV/JSON)
- [X] Add export dropdown to PromptDetail page (CSV/JSON)
- [X] Add toast notifications for export success
- [X] Handle empty state (no prompts to export)

**Features**
- [X] CSV files properly escape special characters (commas, quotes, newlines)
- [X] JSON files include metadata (export date, version, counts)
- [X] Filenames include timestamp for organization
- [X] Export respects filters in PromptList (search, type, goal)

### ✅ Real-time Dashboard Statistics (Completed 2025-11-14)

**Supabase Realtime Integration**
- [X] Implement subscribeToStats in dashboardStore
- [X] Subscribe to seed_prompts table changes
- [X] Subscribe to generated_variations table changes
- [X] Subscribe to mutated_variations table changes
- [X] Subscribe to generation_jobs table changes
- [X] Automatic stats refresh on any table change
- [X] Proper subscription cleanup on component unmount

**Dashboard UI Enhancements**
- [X] Add real-time subscription to Dashboard component
- [X] Add "Live" indicator badge with pulsing animation
- [X] Add mutations stat card (5 total stat cards)
- [X] Update recent prompts list in real-time
- [X] Smooth transitions for stat updates

### ✅ Advanced Features (Completed 2025-11-15)

**Prompt Duplication**
- [X] Implement duplicatePrompt() in seedPromptsStore with deep copy support
- [X] Create DuplicatePromptDialog component with configuration options
- [X] Add duplicate button to PromptList page (actions menu)
- [X] Add duplicate button to PromptDetail page header
- [X] Support duplication of variations and mutations
- [X] Customizable name suffix with live preview
- [X] Automatic navigation to duplicated prompt

**Variation Filtering**
- [X] Create VariationFilterBar component with collapsible UI
- [X] Filter by provider (OpenAI, Anthropic, Gemini)
- [X] Filter by model (dynamically populated from variations)
- [X] Filter by status (Success, Failed, Content Policy Refused)
- [X] Sort by date, provider, or model (ascending/descending)
- [X] Active filter badges with remove buttons
- [X] Clear all filters functionality
- [X] Result count display

**Bulk Operations**
- [X] Add selection state management to seedPromptsStore
- [X] Create BulkActionsToolbar component (floating toolbar)
- [X] Add checkboxes to PromptList table rows
- [X] Implement "Select All" checkbox in table header
- [X] Visual selection state (highlighted rows)
- [X] Bulk delete with confirmation dialog
- [X] Bulk duplicate with configuration dialog
- [X] Bulk export to CSV
- [X] Success/failure tracking for batch operations
- [X] Toast notifications for bulk actions

**AI-Powered Prompt Improvement (Completed 2025-11-15)**
- [X] Create improve-prompt Supabase Edge Function
- [X] Support OpenAI, Anthropic, and Gemini for prompt improvement
- [X] Add prompt assistance provider selection to Settings page
- [X] Create promptAssistant.ts client utility
- [X] Add sparkle button to CreateEditPrompt form
- [X] Context-aware improvements (uses injection type and target goal)
- [X] Loading states and toast notifications
- [X] LocalStorage persistence for provider preference

### ✅ Polish & UX Enhancements (Completed 2025-11-15)

**Loading Skeletons**
- [X] Create reusable Skeleton component with variants (text, circular, rectangular)
- [X] Create DashboardSkeleton component
- [X] Create TableSkeleton component for list pages
- [X] Create DetailSkeleton component
- [X] Create SettingsSkeleton component
- [X] Create AppLoadingSkeleton for initial app load
- [X] Integrate skeletons into all pages (Dashboard, PromptList, PromptDetail, Settings, App)

**Error Boundaries**
- [X] Create ErrorBoundary component with graceful fallback UI
- [X] Add development mode error details display
- [X] Add error recovery actions (Try Again, Reload Page)
- [X] Integrate app-level error boundary
- [X] Add page-level error boundaries for better error isolation
- [X] Add sidebar error boundary

**Keyboard Navigation**
- [X] Create useKeyboardShortcuts hook
- [X] Create KeyboardShortcutsHelp dialog component
- [X] Add global shortcuts (n/c for new prompt, d for dashboard, p for prompts, s for settings)
- [X] Add number shortcuts (1-3 for main pages)
- [X] Add Escape key support for closing dialogs
- [X] Add / shortcut to focus search in PromptList
- [X] Add keyboard shortcuts hint button (? to show help)
- [X] Prevent shortcuts from triggering in input fields (except Escape)

**Responsive Design**
- [X] Make sidebar responsive with hamburger menu on mobile
- [X] Add mobile menu overlay and animations
- [X] Improve Dashboard layout for mobile (responsive grid, better spacing)
- [X] Improve PromptList layout for mobile (table scroll, responsive buttons)
- [X] Improve PromptDetail layout for mobile (stacked buttons, better spacing)
- [X] Improve Settings layout for mobile
- [X] Add touch-manipulation class for better touch targets
- [X] Add proper padding on mobile (pt-20 to account for hamburger menu)
- [X] Hide keyboard shortcuts hint on mobile
- [X] Make all buttons full-width on mobile where appropriate

### ⏳ Not Yet Implemented (Future Work)

**Real-time Features (Remaining)**
- [ ] Implement cross-device sync notifications (toast notifications when other users make changes)

---

### 🔄 Infrastructure Upgrade: Complete Stack Modernization (Planned)

**Goal:** Upgrade all packages to latest versions with automated migration tools
**Total Estimated Time:** 2.5-3.5 hours
**Overall Automation:** ~70%

#### Phase 0: Package Manager Migration (pnpm) - 30-45 min
- [ ] Install pnpm globally
- [ ] Create feature branch: `upgrade/pnpm-and-complete-stack-2025`
- [ ] Import package-lock.json to pnpm-lock.yaml with `pnpm import`
- [ ] Test all commands work with pnpm (dev, test, lint, build)
- [ ] Clean up npm artifacts (node_modules, package-lock.json)
- [ ] Create .npmrc configuration file for pnpm
- [ ] Update .github/workflows/ci.yml for pnpm (add pnpm/action-setup, change cache, update commands)
- [ ] Update justfile (replace all npm commands with pnpm)
- [ ] Update README.md (installation and dev commands)
- [ ] Update TESTING.md (all test commands)
- [ ] Update CLAUDE.md (commands section)
- [ ] Run full CI suite locally to verify
- [ ] Commit: "chore: migrate from npm to pnpm"

#### Phase 1: TypeScript/ESLint Fixes - 30 min
- [ ] Update package.json: typescript 5.6.3 → ^5.9.3
- [ ] Update package.json: typescript-eslint 8.8.1 → ^8.46.4
- [ ] Update package.json: eslint 9.12.0 → ^9.39.1
- [ ] Update package.json: @eslint/js 9.12.0 → ^9.39.1
- [ ] Update package.json: eslint-plugin-react-refresh 0.4.12 → ^0.4.24
- [ ] Fix package.json: zod 4.1.12 → ^3.23.8 (v4 doesn't exist)
- [ ] Update package.json: @supabase/supabase-js 2.57.4 → ^2.81.1
- [ ] Update package.json: @anthropic-ai/sdk 0.68.0 → ^0.69.0
- [ ] Update package.json: autoprefixer 10.4.20 → ^10.4.22
- [ ] Update package.json: lucide-react 0.344.0 → ^0.553.0
- [ ] Run `pnpm install`
- [ ] Run `pnpm ci` to verify all checks pass
- [ ] Commit: "chore: update TypeScript, ESLint, and safe dependencies"

#### Phase 2: React 19 Upgrade with Codemod - 45-60 min
- [ ] Run React 19 codemod: `npx codemod@latest react/19/migration-recipe`
- [ ] Review codemod changes with `git diff`
- [ ] Update dependencies: `pnpm add react@^19.0.0 react-dom@^19.0.0`
- [ ] Update dev dependencies: `pnpm add -D @types/react@^19.0.0 @types/react-dom@^19.0.0`
- [ ] Review ErrorBoundary.tsx for React 19 error handling changes (lines 35-40)
- [ ] Run `pnpm typecheck` and fix any TypeScript errors
- [ ] Test ErrorBoundary error scenarios
- [ ] Test keyboard shortcuts (useRef in PromptList.tsx)
- [ ] Test forms (react-hook-form integration)
- [ ] Test state management (zustand)
- [ ] Test all pages render correctly
- [ ] Run `pnpm test` to verify tests pass
- [ ] Run `pnpm dev` for manual smoke testing
- [ ] Commit: "feat: upgrade to React 19 with codemod validation"

#### Phase 3: Tailwind CSS 3→4 with Automation - 15-25 min
- [ ] Run Tailwind upgrade tool: `npx @tailwindcss/upgrade`
- [ ] Review automated changes with `git diff`
- [ ] Verify tailwind.config.js → CSS @theme migration in src/index.css
- [ ] Verify @tailwind directives → @import "tailwindcss"
- [ ] Verify @tailwindcss/vite plugin added to vite.config.ts
- [ ] Verify postcss.config.js removal
- [ ] Verify autoprefixer dependency removal
- [ ] Run `pnpm install` for updated dependencies
- [ ] Run `pnpm dev` and visually check UI in browser
- [ ] Run `pnpm build` to verify production build
- [ ] Run `pnpm test` to verify tests pass
- [ ] Check responsive design on mobile/tablet/desktop
- [ ] Verify no CSS regressions in key components
- [ ] Commit: "chore: upgrade Tailwind CSS to v4"

#### Phase 4: Vite 5→7 Upgrade - 10-15 min
- [ ] Update dependencies: `pnpm add -D vite@latest @vitejs/plugin-react@latest`
- [ ] Verify vite.config.ts works as-is (should be compatible after Tailwind upgrade)
- [ ] Run `pnpm dev` to test dev server
- [ ] Run `pnpm build` to test production build
- [ ] Run `pnpm preview` to test build output
- [ ] Run `pnpm test` to verify tests pass
- [ ] Verify HMR (Hot Module Replacement) works correctly
- [ ] Commit: "chore: upgrade Vite to v7"

#### Phase 5: Additional Modern Updates - 10-15 min
- [ ] Update: `pnpm add -D eslint-plugin-react-hooks@^7.0.1`
- [ ] Update: `pnpm add -D globals@^16.5.0`
- [ ] Run `pnpm lint` (may reveal hook dependency issues)
- [ ] Run `pnpm lint:fix` to auto-fix issues
- [ ] Fix any remaining hook dependency warnings manually
- [ ] Run `pnpm ci` for full CI check
- [ ] Commit: "chore: upgrade ESLint React hooks plugin to v7"

#### Phase 6: Final Integration Testing - 20-30 min
- [ ] Run `pnpm ci` for comprehensive testing
- [ ] Test all pages load correctly
- [ ] Test forms (create/edit prompts)
- [ ] Test state management (navigation, data persistence)
- [ ] Test keyboard shortcuts functionality
- [ ] Test error boundaries catch errors correctly
- [ ] Test generation workflows complete successfully
- [ ] Test settings page works
- [ ] Test responsive design on mobile/tablet/desktop
- [ ] Test dark mode (if applicable)
- [ ] Run `pnpm build` and check bundle size vs baseline
- [ ] Verify dev server HMR speed
- [ ] Test production bundle load time
- [ ] Document any performance improvements observed

#### Phase 7: Documentation and Cleanup
- [ ] Create final summary commit with complete changelog
- [ ] Update CLAUDE.md if needed with new version info
- [ ] Update README.md if package manager changes affect setup
- [ ] Remove any obsolete documentation references
- [ ] Verify all tests passing ✅
- [ ] Verify no visual regressions ✅
- [ ] Verify performance maintained/improved ✅
- [ ] Push branch and verify GitHub Actions CI passes
- [ ] Create PR with upgrade summary

---

## Task Organization Notes

**What Changed from Original Plan:**
1. **Framework**: Vite + React instead of Next.js (faster iteration, existing UI)
2. **State Management**: Zustand instead of React Context (simpler API, better performance)
3. **Routing**: Client-side routing instead of Next.js App Router
4. **Server Actions**: Not applicable (no Next.js server components)
5. **Authentication**: Manual user provisioning only (no signup form)
6. **RLS Policies**: Simplified - all authenticated users see all data (shared workspace)

**Current MVP Status (Updated 2025-11-15):**
- ✅ Core CRUD for seed prompts
- ✅ Authentication (login/logout)
- ✅ Dashboard with statistics
- ✅ Search and filtering
- ✅ Database schema with all migrations applied
- ✅ **LLM generation fully implemented** (Edge Functions + UI)
- ✅ **Settings page functional** (provider config, model selection)
- ✅ **PromptDetail page with real-time updates**
- ✅ **Toast notification system**
- ✅ **Real-time job progress tracking**
- ✅ **Mutation application UI fully implemented** (selector, preview, apply, display)
- ✅ **API key validation with model fetching** (test connection for all providers)
- ✅ **Export functionality** (CSV/JSON export for prompts, variations, and complete datasets)
- ✅ **Real-time dashboard statistics** (live updates with Supabase Realtime, pulsing "Live" badge)
- ✅ **AI-powered prompt improvement** (sparkle button with configurable LLM provider)
- ✅ **Prompt duplication** (with variations and mutations, configurable options)
- ✅ **Variation filtering** (by provider, model, status; with sorting and active filter badges)
- ✅ **Bulk operations** (select multiple, bulk delete/duplicate/export with floating toolbar)
- ✅ **Loading skeletons** (smooth loading states for all pages)
- ✅ **Error boundaries** (graceful error handling with recovery options)
- ✅ **Keyboard navigation** (global shortcuts, search focus, help dialog)
- ✅ **Responsive design** (mobile-friendly hamburger menu, touch targets, responsive layouts)

**Priority for Next Implementation:**
1. ~~Mutation UI components (connect existing engine)~~ ✅ COMPLETED
2. ~~LLM Provider Connection Testing~~ ✅ COMPLETED
3. ~~Export functionality (CSV/JSON)~~ ✅ COMPLETED
4. ~~Real-time dashboard statistics updates~~ ✅ COMPLETED
5. ~~Advanced features (bulk operations, duplication, filtering)~~ ✅ COMPLETED
6. ~~AI-powered prompt improvement~~ ✅ COMPLETED
7. ~~Polish & UX improvements (loading skeletons, error boundaries, keyboard navigation, responsive design)~~ ✅ COMPLETED
8. Cross-device sync notifications (optional - nice to have)

---

## How to Continue Development

### Deployment Instructions:

**1. Deploy Edge Functions:**
```bash
supabase functions deploy generate-variation
supabase functions deploy validate-api-key
supabase functions deploy improve-prompt
```

**2. Set API keys as secrets:**
```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GEMINI_API_KEY=...
```

**3. Configure and Use:**
- Navigate to Settings page to configure LLM providers (enable/disable, select models)
- Select your preferred AI assistant provider for prompt improvement
- Test API keys using "Test Connection" button for each provider
- Create seed prompts on Dashboard or PromptList page
- Use the sparkle "Improve with AI" button when creating/editing prompts
- Generate variations on PromptDetail page using GenerationConfigForm
- Filter variations by provider, model, or status using the filter bar
- Apply mutations to variations using the "Mutate" button on each variation
- Select multiple prompts using checkboxes for bulk operations
- Export data using Export dropdown on PromptList or PromptDetail pages
- Duplicate prompts with or without variations/mutations
- Monitor real-time stats on Dashboard (look for pulsing "Live" badge)

---

## Testing Strategy

Per constitution, manual testing is acceptable:
- ✅ Manual testing for UI flows
- ✅ Database operations tested via Supabase Dashboard
- ✅ Authentication flow tested via login/logout
- Optional: Add Vitest tests for complex logic (retry, mutations)

---

## Migration from tasks.md v1

This file has been updated to reflect the actual implementation using Vite + React + Zustand instead of the original Next.js plan. The original 119-task breakdown is no longer applicable due to framework change.

# Implementation Plan: Proper Page Routing

**Branch**: `002-page-routing` | **Date**: 2025-11-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-page-routing/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement client-side routing using React Router 7 to enable URL-based navigation, browser history support, direct URL access, and shareable links. The application currently uses state-based navigation with a handleNavigate callback pattern. This will be replaced with React Router's declarative routing while maintaining all existing keyboard shortcuts and navigation patterns.

## Technical Context

**Language/Version**: TypeScript 5.9.3 with React 19.2.0
**Primary Dependencies**: React Router 7, Vite 7.2.2, Zustand 5.0.8, Supabase 2.81.1
**Storage**: Supabase (PostgreSQL) for data persistence, existing auth integration
**Testing**: Vitest 4.0.9 with React Testing Library 16.3.0
**Target Platform**: Modern web browsers (Chrome latest, per spec requirement)
**Project Type**: Single-page web application
**Performance Goals**: Route transitions <250ms (excluding data fetching), 60fps UI interactions
**Constraints**: Must maintain existing keyboard shortcuts, preserve auth flow, no breaking changes to current navigation patterns
**Scale/Scope**: 6 pages (dashboard, prompts list, prompt detail, create/edit, settings, login), ~50 components, single-user hackathon project with potential for growth

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. MVP Speed ✅ PASS
- **MVP First**: Adding React Router is the minimum needed for proper routing. No feature bloat.
- **Skip Premature Optimization**: Using React Router's standard patterns without custom optimization.
- **Refactor When It Hurts**: Current state-based navigation is blocking URL sharing and browser history - this is the "hurts" threshold.
- **Copy-Paste With Judgment**: Will use React Router's standard setup patterns from docs.
- **Good Enough Architecture**: React Router 7 is the standard choice, well-known pattern, boring and fast.

**Assessment**: This feature ships the minimum viable routing implementation to unblock URL-based features. No over-engineering.

### II. Simple But Scalable ✅ PASS
- **Simple Setup**: No changes to `pnpm install && pnpm run dev` workflow.
- **Environment Config Done Right**: No new environment variables needed.
- **Minimal Dependencies**: Adding `react-router-dom` only - single well-established dependency.
- **Database If Needed**: Uses existing Supabase setup, no database changes.
- **Sensible Defaults**: Routes will work out of the box with current page structure.

**Assessment**: Single dependency addition, zero config changes, works with existing setup.

### III. Demo-First Quality ✅ PASS
- **UI Gets Attention**: No visible UI changes - routing is infrastructure.
- **Happy Path Priority**: Focus on main navigation flows first (URL access, back/forward, refresh).
- **Basic Validation**: Will add error boundaries for invalid routes and missing resources.
- **Testing Is Optional**: Manual testing of navigation flows will be sufficient for hackathon timeline.

**Assessment**: Infrastructure change that enables better UX without visible demo impact. Error handling for obvious failures (404, invalid IDs) included.

### Development Standards Compliance
1. **Fast Commits, Readable History**: ✅ Standard commit practices
2. **Tests Are Optional**: ✅ Manual testing sufficient for routing behavior
3. **Reasonable Structure**: ✅ No architectural changes, routes map to existing pages
4. **Documentation: README + Comments**: ✅ Will update README with route structure
5. **Linting**: ✅ No linting exceptions needed

**OVERALL: ✅ PASSES ALL GATES** - This is a pragmatic infrastructure upgrade that unblocks essential web app functionality without violating hackathon speed principles.

---

### Post-Design Re-evaluation (Phase 1 Complete)

**Date**: 2025-11-17

After completing design artifacts (research.md, data-model.md, contracts/, quickstart.md), re-evaluating against constitution:

#### I. MVP Speed ✅ STILL PASSING
- **Research findings**: Confirmed React Router 7 is standard choice, no custom abstraction needed
- **Implementation plan**: 2.5 hours estimated (reasonable for hackathon)
- **Scope validation**: Only client-side routing, no SSR/RSC features that would add complexity
- **Pattern reuse**: Standard BrowserRouter setup, well-documented patterns

**No over-engineering detected**. The design stays focused on core routing needs.

#### II. Simple But Scalable ✅ STILL PASSING
- **Dependency audit**: Single dependency (react-router-dom), ~30KB gzipped
- **Configuration**: Zero config needed, BrowserRouter works out of box
- **Migration path**: Clean upgrade path from state-based to router-based navigation
- **Database**: No schema changes, uses existing Supabase setup

**No configuration complexity added**. Setup remains simple.

#### III. Demo-First Quality ✅ STILL PASSING
- **UI impact**: Zero visible changes (infrastructure only)
- **Error handling**: 404 pages, invalid ID handling, permission errors covered
- **Testing plan**: Manual testing sufficient (no test suite required)
- **Edge cases**: Addressed in spec (concurrent navigation, loading states, expired sessions)

**Demo quality maintained**. Error handling covers obvious failures without over-engineering.

#### Development Standards ✅ STILL PASSING
- **Structure**: New `src/routes/` directory, minimal changes to existing files
- **Documentation**: quickstart.md provides clear implementation guide
- **Type safety**: contracts/routes.ts provides type-safe route definitions
- **Code organization**: Route concerns separated from page components

**No violations introduced**. Structure remains clean and organized.

**FINAL ASSESSMENT: ✅ DESIGN APPROVED** - All constitutional principles upheld through design phase. Ready for implementation.

## Project Structure

### Documentation (this feature)

```text
specs/002-page-routing/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── routes.ts        # Route definitions and types
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/          # Existing UI components
│   ├── Sidebar.tsx      # Update to use router navigation
│   ├── ErrorBoundary.tsx # Existing error boundary
│   └── [other components remain unchanged]
├── pages/               # Existing page components (no changes)
│   ├── Dashboard.tsx
│   ├── LoginPage.tsx
│   ├── CreateEditPrompt.tsx
│   ├── PromptDetail.tsx
│   ├── PromptList.tsx
│   └── Settings.tsx
├── hooks/               # Existing hooks
│   └── useKeyboardShortcuts.ts # Update to use router navigation
├── stores/              # Existing Zustand stores (no changes)
│   └── authStore.ts
├── lib/                 # Existing utilities (no changes)
├── routes/              # NEW: Router configuration
│   ├── index.tsx        # Route definitions and BrowserRouter setup
│   ├── ProtectedRoute.tsx # Auth guard component
│   └── ErrorPage.tsx    # 404 and error pages
├── App.tsx              # Update to use React Router
└── main.tsx             # Entry point (minimal changes)

tests/
└── [existing test structure]
```

**Structure Decision**: Single-page web application structure maintained. Adding a new `src/routes/` directory for router-specific code. All existing page components in `src/pages/` remain unchanged - they just get wrapped by routes. The handleNavigate callback pattern will be replaced with React Router's `useNavigate` hook and `<Link>` components.

## Complexity Tracking

> **No violations - Constitution Check passed all gates.**

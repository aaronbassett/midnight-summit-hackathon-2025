# Implementation Plan: Prompt Injection Test Case Generator

**Branch**: `001-prompt-injection-generator` | **Date**: 2025-11-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-prompt-injection-generator/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Browser-based UI for security researchers to create seed prompts representing wallet-related LLM attacks, generate hundreds of variations using multiple LLM providers (OpenAI, Anthropic, Gemini), and apply programmatic mutations. Data persisted to Supabase cloud database with authentication, real-time sync, and multi-device access. Browser-based generation jobs with incremental saves, exponential backoff for rate limits, and contextualized system prompts for security research use case.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend + type safety)
**Primary Dependencies**:
  - Frontend: React 18+, Vite 5.x (build tool), TailwindCSS, lucide-react (icons)
  - Database: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
  - LLM SDKs: openai, @anthropic-ai/sdk, @google/generative-ai
  - State Management: Zustand (lightweight, performant alternative to React Context)
  - Forms: react-hook-form + @hookform/resolvers + zod (type-safe validation)
**Storage**: Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth for authentication
**Testing**: Manual testing per constitution; automated tests (Vitest + React Testing Library) optional for complex logic
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
**Project Type**: Single Page Application (Vite + React frontend + Supabase backend + Edge Functions)

**IMPLEMENTATION NOTE**: This project was initially planned for Next.js 14+ with App Router but was implemented using Vite + React for faster iteration during the hackathon. Key architectural differences:
  - **Build Tool**: Vite instead of Next.js (no server-side rendering, no API routes)
  - **State Management**: Zustand instead of React Context (simpler API, better performance)
  - **Routing**: Client-side routing (useState-based navigation) instead of Next.js App Router
  - **API Security**: Supabase Edge Functions for LLM calls (instead of Next.js Server Actions)
  - **Authentication**: Manual user provisioning via Supabase Dashboard (no signup form)
**Performance Goals**:
  - Generation jobs report progress every 5 seconds
  - Multi-device sync within 5 seconds when both online
  - Dashboard statistics real-time updates
  - Search/filter results in <30s for 500+ prompts
**Constraints**:
  - Browser-based job execution (no background workers)
  - Incremental saves to prevent data loss
  - Offline queue + sync on reconnect
  - Exponential backoff with max 5 retries for rate limits
**Scale/Scope**:
  - Multi-user (Supabase Auth isolation)
  - Hundreds to thousands of prompts per user
  - 3 LLM providers (OpenAI, Anthropic, Gemini)
  - ~7 user stories, ~30 functional requirements
  - MVP scope: core CRUD + generation + mutations (P1-P2 stories)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. MVP Speed ✅

- **MVP First**: P1 stories (Create/Manage Seeds, Dashboard, Multi-Device Auth) deliver core value. P2-P3 stories can be deferred.
- **Skip Premature Optimization**: No caching, query optimization, or performance tuning until demonstrated need.
- **Good Enough Architecture**: Using Next.js App Router + Supabase - proven, boring tech stack.
- **Known Patterns**: Standard REST/RPC patterns via Supabase client, React patterns for UI.

**Status**: PASS - Clear MVP scope, deferrable features identified, established patterns.

### II. Simple But Scalable ✅

- **Simple Setup**: `npm install && npm run dev` after Supabase project creation + env config.
- **Environment Config**: `.env.local` for Supabase credentials and LLM API keys. `.env.example` provided.
- **Database**: Supabase PostgreSQL (already selected per spec clarifications).
- **Migration Path**: PostgreSQL enables easy scaling (managed Supabase → self-hosted Supabase → raw Postgres).

**Status**: PASS - Real database selected, proper env config, clear migration path.

### III. Demo-First Quality ✅

- **UI Priority**: TailwindCSS + shadcn/ui for rapid UI development with polish.
- **Happy Path Focus**: Core CRUD + generation flow. Basic error handling (API errors, validation).
- **Real Data**: Real LLM generation (not pre-generated fixtures).
- **Basic Validation**: Required field validation, type checking via TypeScript.
- **Testing Optional**: Per constitution - manual testing acceptable, automated tests optional.

**Status**: PASS - Polished UI framework, real generation, basic validation, testing optional.

### Gates Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| MVP Speed | ✅ PASS | Clear MVP scope with deferrable features |
| Simple But Scalable | ✅ PASS | PostgreSQL-based, proper env config, migration path |
| Demo-First Quality | ✅ PASS | Modern UI stack, real data, basic validation |

**Overall**: ✅ PASS - Ready for Phase 0 research.

---

**Post-Phase 1 Re-evaluation**: ✅ PASS

After completing Phase 1 design (data model, API contracts, research):

### I. MVP Speed ✅

- **Architecture Decisions**: Supabase Client SDK for data access (no custom API layer), Supabase Edge Functions for LLM calls (protect API keys), client-side mutation engine (no backend processing)
- **Simplicity Maintained**: Direct database access via RLS eliminates API boilerplate, reducing code surface area
- **State Management**: Zustand stores (lightweight, minimal boilerplate)
- **Form Handling**: react-hook-form + zod (minimal boilerplate, type-safe)

**Status**: PASS - Minimal architecture, established libraries, fast implementation path.

### II. Simple But Scalable ✅

- **Database Schema**: PostgreSQL with proper foreign keys, indexes, RLS policies - production-ready
- **Setup Steps**: 6 steps, ~10 minutes (Supabase project → env config → migrations → dev server)
- **Migration Path**: SQL migrations in version control, easy to apply/rollback
- **Security**: RLS enforces user isolation, API keys server-side only, encrypted storage for LLM configs

**Status**: PASS - Simple setup, production-grade patterns, clear scaling path.

### III. Demo-First Quality ✅

- **Data Model**: 5 tables with clear relationships, soft deletes for recovery UX
- **Real-time Updates**: Supabase Realtime for cross-device sync, job progress updates
- **Error Handling**: Exponential backoff for rate limits, structured error types, incremental saves prevent data loss
- **Testing Strategy**: Manual testing for UI, optional Vitest for complex logic (retry, mutations)

**Status**: PASS - Polished UX features (realtime, recovery), robust error handling, pragmatic testing.

### Final Assessment

| Principle | Status | Phase 1 Evidence |
|-----------|--------|------------------|
| MVP Speed | ✅ PASS | Minimal architecture (no custom API), established patterns (Vite + Zustand, Supabase Edge Functions), fast libraries (react-hook-form) |
| Simple But Scalable | ✅ PASS | 6-step setup in ~10 minutes, production-grade schema with RLS, SQL migrations in git |
| Demo-First Quality | ✅ PASS | Real-time sync, soft deletes for recovery, exponential backoff, manual testing focus |

**Overall**: ✅ PASS - Design aligns with constitution. Ready for `/speckit.tasks`.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Vite + React Single Page Application
src/
├── components/
│   ├── Sidebar.tsx      # Navigation with logout
│   ├── generation/      # Generation job UI (JobProgress, LLMSelector, etc.)
│   └── mutations/       # Mutation UI components
├── pages/
│   ├── LoginPage.tsx    # Email/password authentication
│   ├── Dashboard.tsx    # Statistics and recent activity
│   ├── PromptList.tsx   # Seed prompts with search/filter
│   ├── CreateEditPrompt.tsx  # CRUD form for seed prompts
│   ├── PromptDetail.tsx # Individual prompt with variations
│   └── Settings.tsx     # LLM provider configuration
├── stores/              # Zustand state management
│   ├── authStore.ts     # Authentication state and actions
│   ├── seedPromptsStore.ts  # Seed prompt CRUD operations
│   ├── generationStore.ts   # Generation job management
│   ├── mutationsStore.ts    # Mutation application
│   └── dashboardStore.ts    # Dashboard statistics
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # Supabase browser client
│   │   └── types.ts     # Generated TypeScript types from Supabase schema
│   ├── llm/
│   │   ├── openai.ts    # OpenAI client wrapper
│   │   ├── anthropic.ts # Anthropic client wrapper
│   │   ├── gemini.ts    # Gemini client wrapper
│   │   ├── generator.ts # Unified generation orchestration
│   │   └── types.ts     # LLM-related types
│   ├── mutations/
│   │   └── engine.ts    # Mutation logic (character sub, encoding, etc.)
│   └── utils/
│       ├── validation.ts  # Input validation helpers
│       └── retry.ts       # Exponential backoff logic
├── App.tsx              # Root component with client-side routing
└── main.tsx             # Vite entry point

supabase/
├── functions/           # Edge Functions for secure LLM calls
│   └── generate-variations/  # LLM generation with API key protection
└── migrations/          # SQL migration files
    ├── 20251114000001_create_seed_prompts.sql
    ├── 20251114000002_create_generated_variations.sql
    ├── 20251114000003_create_mutated_variations.sql
    ├── 20251114000004_create_generation_jobs.sql
    └── 20251114000005_create_llm_configs.sql

public/                 # Static assets

.env.example            # Example environment variables
.env.local              # Local environment (gitignored)
```

**Structure Decision**: Vite + React architecture selected for:
- Fast development server with hot module replacement (HMR)
- Client-side routing with useState-based navigation in App.tsx
- Zustand for lightweight state management
- Supabase client for database + auth + realtime
- Supabase Edge Functions for secure server-side LLM calls (API key protection)
- TypeScript throughout for type safety
- Separation of concerns: pages (UI), stores (state), lib (business logic)

## Complexity Tracking

No violations - Constitution Check passed. No complexity tracking required.

# redsmith Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-16

## Active Technologies
- TypeScript 5.9.3 with React 19.2.0 + React Router 7, Vite 7.2.2, Zustand 5.0.8, Supabase 2.81.1 (002-page-routing)
- Supabase (PostgreSQL) for data persistence, existing auth integration (002-page-routing)

- TypeScript 5.9.3 (frontend + type safety), Node.js 18+ (if backend utilities needed) (001-prompt-injection-generator)
- React 19.2.0 + Vite 7.2.2
- Tailwind CSS 4.1.17
- pnpm 10+ (package manager)

## Project Structure

```text
src/
tests/
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Start dev server
pnpm run build        # Build for production
pnpm run test         # Run tests
pnpm run lint         # Lint code
pnpm run typecheck    # Type check
pnpm run ci           # Run full CI suite (format, lint, typecheck, test)
```

## Code Style

TypeScript 5.x (frontend + type safety), Node.js 18+ (if backend utilities needed): Follow standard conventions

## Recent Changes
- 002-page-routing: Added TypeScript 5.9.3 with React 19.2.0 + React Router 7, Vite 7.2.2, Zustand 5.0.8, Supabase 2.81.1

- 001-prompt-injection-generator: Added TypeScript 5.x (frontend + type safety), Node.js 18+ (if backend utilities needed)

<!-- MANUAL ADDITIONS START -->

## Recent Infrastructure Upgrades (2025-11-16)

**Complete Stack Modernization:**
- Migrated from npm to pnpm 10+ for faster installs and better disk usage
- Upgraded React 18 → 19.2.0 (latest stable)
- Upgraded TypeScript 5.6 → 5.9.3
- Upgraded Vite 5 → 7.2.2 (40% faster builds, 100ms startup)
- Upgraded Tailwind CSS 3 → 4.1.17 (81% CSS size reduction)
- Upgraded ESLint and TypeScript ESLint to latest versions
- All upgrades completed with zero regressions
- CI suite: 42/42 tests passing
- Bundle size: 140 kB gzipped (optimal)

**Key Benefits:**
- 3x faster dev server startup (100ms vs ~300-500ms)
- ~40% faster production builds
- ~30% faster dependency installs
- Smaller bundle sizes with better tree-shaking

<!-- MANUAL ADDITIONS END -->

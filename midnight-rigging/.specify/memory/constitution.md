<!--
SYNC IMPACT REPORT
==================
Version Change: None → 1.0.0 (initial constitution)
Ratification Date: 2025-11-17 (today)

Modified/Added Principles:
- NEW: Principle I - MVP Speed
- NEW: Principle II - Simple But Scalable
- NEW: Principle III - Demo-First Quality

Added Sections:
- Development Standards (covering commits, testing, structure, documentation, linting)
- Governance (amendment procedure, compliance)

Templates Requiring Updates:
- ⚠️ plan-template.md - Constitution Check section needs hackathon-specific gates
- ⚠️ spec-template.md - Requirements may need relaxation for hackathon speed
- ⚠️ tasks-template.md - Test tasks marked as optional (aligned with new principle)

Follow-up TODOs:
- Update plan-template.md Constitution Check with hackathon-appropriate gates
- Review spec-template.md requirements for MVP-first approach compatibility
- Verify tasks-template.md reflects optional testing and rapid iteration approach
-->

# Midnight Rigging Constitution

## Preamble

This is a hackathon project to bring midnight network smart contract development to Claude Code. Speed is critical, but not at the cost of a foundation that needs immediate rewriting. Build the MVP fast with practices that won't embarrass you if this wins and continues. Good enough to ship, good enough to evolve.

**Project Goal**: Fork pod-rigging plugin architecture to support midnight network's Compact smart contract language, zero-knowledge proof development, and privacy-first blockchain tooling.

## Core Principles

### I. MVP Speed

**Ship the smallest working version as fast as possible. Iterate based on what you actually need.**

Non-negotiable rules:

- **MVP First**: Build the minimum feature set that demonstrates value. Cut features aggressively, but keep code quality reasonable.
- **Skip Premature Optimization**: Don't optimize queries, caching, or performance until you see actual problems. Simple and working beats optimized and broken.
- **Refactor When It Hurts**: If code slows you down or becomes genuinely confusing, refactor it. Otherwise keep moving forward.
- **Copy-Paste With Judgment**: Reusing working code is fine. Understanding what you paste is also fine. Just ship fast.
- **Good Enough Architecture**: Use patterns you know well. Don't experiment with new architectures during a hackathon. Boring and fast wins.

**Rationale**: Hackathons reward working demos, but this might become real. Build fast without creating technical debt that forces a complete rewrite if you continue.

### II. Simple But Scalable

**Build for local development, but don't lock yourself into local-only decisions.**

Non-negotiable rules:

- **Simple Setup**: `npm install && npm run dev` should work. Use a real database if you need one (SQLite for local, easy migration path to Postgres later).
- **Environment Config Done Right**: Use `.env` files for credentials and config. Provide `.env.example` with sensible defaults. Don't hardcode secrets.
- **Minimal Dependencies**: Only add packages that save significant time. But don't avoid good tools just to keep dependency count low.
- **Database If Needed**: If your data model needs a DB, use one. SQLite is fast to set up and easy to migrate from later.
- **Sensible Defaults**: Config should work out of the box for local dev. Document the 2-3 things judges need to change if any.

**Rationale**: Local-first speeds up development, but use patterns that work in production too. If this becomes real, you don't want to rewrite data access or config management.

### III. Demo-First Quality

**Prioritize what's visible in the demo, but don't skip all error handling and validation.**

Non-negotiable rules:

- **UI Gets Attention**: Polish the screens you'll demo. Judges see interfaces, not code. Tailwind makes this fast - use it.
- **Happy Path Priority**: Focus on the main flow first. Add error handling for the obvious failures (API down, invalid input), skip exotic edge cases.
- **Real Data If Possible**: Use real data generation if it's fast enough. Pre-generated data is fine for the demo, but build the real thing if time allows.
- **Basic Validation**: Don't skip input validation entirely. Basic checks prevent embarrassing demo crashes.
- **Testing Is Optional**: If manual testing the flow works, ship it. If you have time and want automated tests for complex logic, add them. Not required.

**Rationale**: Demos are visual, but judges also ask "does it really work?" Build the happy path solidly, handle obvious errors, skip perfection.

## Development Standards

### Fast Commits, Readable History

- Commit directly to main (solo hackathon = no branch overhead).
- Commit messages should be clear enough to understand later: "add data generation API" not "stuff".
- Commit when something works. Don't batch up a day's work into one commit.

### Tests Are Optional, Not Forbidden

- Tests are optional for hackathon speed. If manual testing works, ship it.
- If you're touching complex logic and tests would save debugging time, write them.
- If you have TDD muscle memory and it helps you move fast, use it.
- Integration tests over unit tests if you do test.

### Reasonable Structure

- Separate concerns enough that files aren't 1000+ lines of mixed logic.
- Use service layers, models, and components if they help you organize. Don't inline everything into one giant file.
- Aim for "easy to find things" not "perfect architecture."

### Documentation: README + Comments

README should cover:

- What this does (1-2 sentences)
- Setup instructions (ideally just `npm install && npm run dev`)
- Environment config needed (if any)
- How to run the demo

Code comments for non-obvious decisions (e.g., "using SQLite for local dev, easy to migrate to Postgres later").

No need for architecture docs or API docs unless they help you.

### Linting: Run It, Don't Obsess

- Linter should catch actual bugs (unused variables, type errors).
- Style warnings are low priority - fix them if fast, ignore them if not.
- Auto-format on save (Prettier) is a time-saver - use it.
- Don't let linter warnings block progress, but don't disable it entirely.

## Governance

### Amendment Procedure

This constitution can be amended when project needs evolve (e.g., transitioning from hackathon to production).

Amendment process:

1. Document proposed changes with rationale
2. Update version according to semantic versioning:
   - **MAJOR**: Backward incompatible governance/principle removals or redefinitions
   - **MINOR**: New principle/section added or materially expanded guidance
   - **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements
3. Update dependent templates and documentation
4. Record change in Sync Impact Report (HTML comment at top of this file)

### Compliance Review

All feature specifications and implementation plans should reference this constitution.

For hackathon development:

- **Constitution Check** in plan.md should verify alignment with MVP Speed, Simple But Scalable, and Demo-First Quality principles
- Complexity violations are acceptable if justified (e.g., "Adding auth framework because judges will ask about security")
- Tests are optional by default - only include if spec explicitly requests them or complex logic demands it

Use `CLAUDE.md` for runtime development guidance (agent-specific instructions).

**Version**: 1.0.0 | **Ratified**: 2025-11-17 | **Last Amended**: 2025-11-17

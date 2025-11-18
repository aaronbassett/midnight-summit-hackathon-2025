# Midnight Summit Hackathon Constitution

<!--
Sync Impact Report - Constitution Update
================================================================================
Version Change: 0.0.0 → 1.0.0
Rationale: Initial constitution creation with hackathon-specific principles

Modified/Added Principles:
- I. MVP Speed (NEW) - Ship smallest working version fast, iterate based on need
- II. Simple But Scalable (NEW) - Local-first development with production patterns
- III. Demo-First Quality (NEW) - Prioritize visible features with solid happy path

Removed Sections: None (initial version)

Template Consistency Status:
✅ plan-template.md - Constitution Check section compatible
✅ spec-template.md - User story structure aligns with MVP/demo priorities
✅ tasks-template.md - Supports hackathon workflow with optional tests
⚠️  No command files found in .specify/templates/commands/

Follow-up TODOs: None
================================================================================
-->

## Core Principles

### I. MVP Speed

**Ship the smallest working version as fast as possible. Iterate based on what you actually need.**

- **MVP First**: Build the minimum feature set that demonstrates value. Cut features aggressively, but keep code quality reasonable.
- **Skip Premature Optimization**: Don't optimize queries, caching, or performance until you see actual problems. Simple and working beats optimized and broken.
- **Refactor When It Hurts**: If code slows you down or becomes genuinely confusing, refactor it. Otherwise keep moving forward.
- **Copy-Paste With Judgment**: Reusing working code is fine. Understanding what you paste is also fine. Just ship fast.
- **Good Enough Architecture**: Use patterns you know well. Don't experiment with new architectures during a hackathon. Boring and fast wins.

**Rationale**: Hackathons reward working demos, but this might become real. Build fast without creating technical debt that forces a complete rewrite if you continue.

### II. Simple But Scalable

**Build for local development, but don't lock yourself into local-only decisions.**

- **Simple Setup**: `npm install && npm run dev` should work. Use a real database if you need one (SQLite for local, easy migration path to Postgres later).
- **Environment Config Done Right**: Use `.env` files for credentials and config. Provide `.env.example` with sensible defaults. Don't hardcode secrets.
- **Minimal Dependencies**: Only add packages that save significant time. But don't avoid good tools just to keep dependency count low.
- **Database If Needed**: If your data model needs a DB, use one. SQLite is fast to set up and easy to migrate from later.
- **Sensible Defaults**: Config should work out of the box for local dev. Document the 2-3 things judges need to change if any.

**Rationale**: Local-first speeds up development, but use patterns that work in production too. If this becomes real, you don't want to rewrite data access or config management.

### III. Demo-First Quality

**Prioritize what's visible in the demo, but don't skip all error handling and validation.**

- **UI Gets Attention**: Polish the screens you'll demo. Judges see interfaces, not code. Tailwind makes this fast - use it.
- **Happy Path Priority**: Focus on the main flow first. Add error handling for the obvious failures (API down, invalid input), skip exotic edge cases.
- **Real Data If Possible**: Use real data generation if it's fast enough. Pre-generated data is fine for the demo, but build the real thing if time allows.
- **Basic Validation**: Don't skip input validation entirely. Basic checks prevent embarrassing demo crashes.
- **Testing Is Optional**: If manual testing the flow works, ship it. If you have time and want automated tests for complex logic, add them. Not required.

**Rationale**: Demos are visual, but judges also ask "does it really work?" Build the happy path solidly, handle obvious errors, skip perfection.

## Development Standards

### 1. Fast Commits, Readable History

- Commit directly to main (solo hackathon = no branch overhead).
- Commit messages MUST be clear enough to understand later: "add data generation API" not "stuff".
- Commit when something works. Don't batch up a day's work into one commit.

### 2. Tests Are Optional, Not Forbidden

- Tests are optional for hackathon speed. If manual testing works, ship it.
- If you're touching complex logic and tests would save debugging time, write them.
- If you have TDD muscle memory and it helps you move fast, use it.
- Integration tests over unit tests if you do test.

### 3. Reasonable Structure

- Separate concerns enough that files aren't 1000+ lines of mixed logic.
- Use service layers, models, and components if they help you organize. Don't inline everything into one giant file.
- Aim for "easy to find things" not "perfect architecture."

### 4. Documentation: README + Comments

- README MUST cover:
  - What this does (1-2 sentences)
  - Setup instructions (ideally just `npm install && npm run dev`)
  - Environment config needed (if any)
  - How to run the demo
- Code comments for non-obvious decisions (e.g., "using SQLite for local dev, easy to migrate to Postgres later").
- No need for architecture docs or API docs unless they help you.

## Code Quality

### Structure Requirements

- **File Organization**: Separate concerns to keep files under 1000 lines
- **Service Layers**: Use service layers, models, and components when they aid organization
- **Findability**: Prioritize "easy to find things" over perfect architecture patterns

### Error Handling

- **Happy Path First**: Implement main user flow before edge cases
- **Basic Validation**: Input validation MUST prevent demo crashes from obvious errors
- **Obvious Failures Only**: Handle API failures and invalid input; skip exotic edge cases

### Performance

- **No Premature Optimization**: Only optimize when you see actual problems
- **Real Data Generation**: Use real data if fast enough; pre-generated data acceptable for demos

## Governance

### Amendment Process

This constitution can be amended at any time during the hackathon if principles need adjustment. Update the version number according to semantic versioning:

- **MAJOR**: Backward incompatible changes to core principles
- **MINOR**: New principles or significant expansions
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Review

- All feature specifications MUST align with MVP Speed and Demo-First Quality principles
- Implementation plans MUST verify Simple But Scalable patterns are used
- Testing requirements are OPTIONAL unless complexity demands them
- Constitution violations MUST be justified in the Complexity Tracking section of plan.md

### Development Guidance

Use this constitution as the primary decision-making framework. When in doubt:
1. Does it ship faster? (Principle I)
2. Can we scale it later if needed? (Principle II)
3. Will it demo well? (Principle III)

**Version**: 1.0.0 | **Ratified**: 2025-11-18 | **Last Amended**: 2025-11-18

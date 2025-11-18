<!--
SYNC IMPACT REPORT
==================
Version: 0.0.0 → 1.0.0
Rationale: Initial constitution ratification with comprehensive principles

Added Principles:
- I. Ship Fast, Fix What Hurts
- II. Build for Joy, Not Scale
- III. Simplicity & Pragmatism (KISS & YAGNI)
- IV. Make It Work, Then Make It Fast
- V. Modularity & Single Responsibility
- VI. User Experience First

Added Sections:
- Development & Testing Standards
- Technical Standards
- Naming Conventions
- Voice & Tone
- Anti-Patterns to Avoid
- When to Break the Rules

Templates Status:
✅ plan-template.md - Constitution Check section verified (line 30-34)
✅ spec-template.md - Requirements structure aligns with UX-first principles
✅ tasks-template.md - Task organization supports modularity and testing standards
⚠ checklist-template.md - Not reviewed (content unknown)
⚠ agent-file-template.md - Not reviewed (content unknown)
⚠ Commands directory - Not found (may not exist yet)

Follow-up Actions:
- Review checklist-template.md for alignment with testing standards
- Review agent-file-template.md for alignment with voice & tone guidelines
- Create command files following naming conventions when needed
- Create README.md documenting project setup and usage
-->

# Bandaid Constitution

**Ship it. Use it. Fix what hurts. Repeat.**

## Preamble

We build tools to eliminate friction in esoteric development environments, not to achieve theoretical perfection. Every interaction should feel effortless, predictable, and occasionally delightful.

## Core Principles

### I. Ship Fast, Fix What Hurts

**Build the smallest useful thing, dogfood it immediately, and iterate based on real pain.**

- **Dogfood Relentlessly**: Use the tool daily in actual development work. If you're not using it, you're guessing.
- **Fix Actual Friction**: Prioritize fixing things that annoy you in real usage, not hypothetical edge cases from spec documents.
- **Get It Working First**: A working tool with mediocre search accuracy beats a perfect tool that doesn't exist. Ship it, use it, measure it, then tune.
- **Refactor When It Hurts**: Refactor when velocity suffers or code becomes genuinely hard to understand. Not because it "feels messy."
- **Premature Optimization is Evil**: Don't optimize search indexing strategies, data models, or query patterns until real usage proves there's a problem.

**Rationale**: Shipping working software creates value. Optimizing non-existent or broken software wastes time. Build it, use it, measure it, then optimize the parts that actually matter. Performance requirements often change dramatically after real-world usage anyway.

### II. Build for Joy, Not Scale

**This is a personal tool used daily. Every interaction should feel effortless, predictable, and occasionally delightful.**

- **Good Enough Ships**: Perfect is the enemy of done. A tool that compiles code and queries docs beats one that does neither but has "beautiful architecture."
- **Responsive & Predictable**: Modules should invoke cleanly, search queries should return useful results, and errors should be actionable—not mysterious.
- **Anticipate Needs**: Design with empathy for yourself-as-user. What would save you 30 seconds fifty times a day?
- **Don't Gold-Plate**: Ship, iterate, polish what matters. The best feature eliminates repetitive bullshit.

**Rationale**: This is a tool you'll lean on daily. It should feel like a well-worn keyboard—responsive, predictable, and occasionally surprising you with how well it anticipates your needs. Not because it's "smart," but because you've designed it with empathy for yourself.

### III. Simplicity & Pragmatism (KISS & YAGNI)

**Do the simplest thing that could possibly work. Resist the urge to architect for scenarios that don't exist yet.**

- **No Speculative Features**: Don't build a "network manager module" until you actually need to manage local networks. YAGNI.
- **Minimal Complexity**: If you can't explain a Module's purpose in one sentence, it's too complex. Break it down or delete it.
- **Dependencies Must Earn Their Keep**: Every package, background service, or external tool must solve a real, immediate problem. No "might need it later."
- **Embrace "Good Enough"**: Ship working software, not perfect architecture.

**Rationale**: Simplicity enables fast iteration, easier maintenance, and clearer reasoning. Complexity is the primary source of bugs and development friction.

### IV. Make It Work, Then Make It Fast

**Correctness and utility always come first. Performance is a feature, not a prerequisite.**

- **Correctness First**: Deliver working functionality before worrying about search query latency, result quality, or index sizes.
- **No Premature Optimization**: Avoid adding complexity (caching layers, hybrid search, query reformulation) for theoretical performance gains. "Fast enough" is good enough until proven otherwise.
- **Tune Accuracy Last**: Get the tool building code and returning docs. Then iterate on search relevance based on real queries.

**Rationale**: Most performance problems don't exist until they're measured. Premature optimization wastes time, adds complexity, and often solves non-existent problems.

### V. Modularity & Single Responsibility

**Every component (Module, Service, Configuration, template) MUST do one thing and do it well.**

- **Single Purpose**: Each component should have one clear responsibility. The `search-query` Module queries knowledge. The `environment-setup` Module sets up environments. Don't blur lines.
- **Composable Design**: Complex workflows emerge from simple, composable Modules. Keep them atomic.
- **Clarity in Naming**: Module names, Service names, and component triggers should be unambiguous. `code-compiler`, not `smart-helper`.

**Rationale**: Predictability through clarity. When each component has one purpose, debugging, testing, and extension become straightforward.

### VI. User Experience First

**Design for humans, then automation.**

- **Frictionless Setup**: `/project install my-tool` should just work. No config files, no environment variables (unless unavoidable), no manual database setup.
- **Human-Readable Errors**: "API connection failed: https://api.example.com returned 503. Check network status or try a different endpoint." Not "Error: ECONNREFUSED."
- **Actionable Feedback**: "Build failed: Missing dependency '@example/common-lib'. Run `npm install @example/common-lib`."
- **Empathetic Design**: Assume the user is frustrated and in a hurry. Don't waste their time with vague errors or unhelpful output.

**Rationale**: Friction kills adoption. If the tool is annoying to use, you won't use it. And if you won't use it, it's useless.

## Development & Testing Standards

### 1. Integration Tests Are Your Safety Net

**Test real workflows against real environments. Mocks are a last resort.**

- **Integration Tests First**: Prioritize tests that hit real test APIs, build actual artifacts, and query real search indexes (or test fixtures).
- **Mocks Sparingly**: Only mock:
  - Destructive operations (production deploys, irreversible transactions)
  - Costly operations (external paid APIs)
  - Specific error states (simulate 503s, rate limits)
- **Don't Test Your Mocks**: If all tests pass but the project doesn't work with real APIs, tests are useless. Verify against reality.
- **Dogfooding is Testing**: Daily use by you (the developer) is a valid and essential form of testing.

**Rationale**: Confidence comes from knowing the tool works end-to-end. Mocked tests don't catch integration failures, API changes, or environmental issues.

### 2. Test Value Over Metrics

**Focus on catching actual bugs, not chasing coverage percentages.**

- **Test What Matters**: Does the `code-compiler` Module actually compile code? Does the search query return relevant docs? That's what matters.
- **Maintainable Tests**: Tests should be easy to run locally before pushing. Not flaky, not fragile.
- **Fix or Delete Bad Tests**: Flaky tests are worse than no tests. If a test is unreliable, fix it immediately or delete it.
- **Unit Tests Where They Make Sense**: Pure functions, utility libraries, parsing logic—these are fine to unit test. But don't cargo-cult TDD for everything.

**Rationale**: Over-testing wastes time; under-testing creates debugging hell. Balance pragmatism. For a personal tool, integration tests catch regressions without ceremony.

### 3. CI/CD Discipline

**All tests and linters must pass in CI before merging.**

- **All Tests Run in CI**: No exceptions. If it doesn't run in CI, it doesn't exist.
- **Linters Block Builds**: Linter warnings must block CI and should never be merged. Fix before pushing.
- **Definition of Done**: A task is not "done" until all tests pass and linters are happy.

**Rationale**: CI enforces discipline. Manual "I'll fix it later" never happens. Automate the annoying stuff.

## Technical Standards

### 1. Configuration & Setup

- **Externalize Config**: Environment-specific values (API URLs, API keys, network IDs) should be configurable. But default to sane values so setup is optional.
- **Zero-Config User Experience**: The tool should work out-of-the-box for 80% of users. Advanced users can tweak if needed.
- **Baked-In Data**: Search databases, indexes, and templates should be bundled with the tool. No external dependencies at runtime.

### 2. Error Handling

- **Fail Loudly & Clearly**: If something goes wrong, say what failed, why, and what to do about it.
- **No Silent Failures**: Log errors, surface them to the user, and provide context.
- **Graceful Degradation**: If the API is down, say so. Don't pretend everything is fine.

### 3. Commit Standards

**Follow Conventional Commits to ensure a clear, searchable git history.**

Format: `<type>(<scope>): <subject>`

**Types:**
- `feat`: New feature (new Module, Service, template)
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no behavior change)
- `test`: Adding or updating tests
- `chore`: Maintenance, dependencies, tooling
- `perf`: Performance improvement

**Example**: `feat(search-query): add hybrid search with keyword fallback`

### 4. Documentation

- **README First**: Installation, setup, and basic usage examples must be in the README.
- **Module Documentation**: Each Module's `MODULE.md` should clearly explain:
  - What it does
  - How it's used
  - What tools/data it uses
  - Example usage
- **Code Comments**: Comment the *why*, not the *what*. Assume the reader understands TypeScript but not your reasoning.

### 5. Versioning & Dependencies

- **Use Latest Everything**: Use the latest stable versions of Node, packages, and core APIs. Don't pin to old versions "just in case."
- **Semantic Versioning**: Tool versions follow semver (MAJOR.MINOR.PATCH).
  - MAJOR: Breaking changes (API changes, removed Modules, incompatible updates)
  - MINOR: New Modules, templates, or features
  - PATCH: Bug fixes, doc updates, minor improvements
- **Update Knowledge Base = New Version**: Rebuilding the search corpus triggers a MINOR version bump.

## Naming Conventions

**Summary**: Lowercase, builder-focused, no bullshit. Like the tool itself—unpretentious, functional, occasionally delightful.

### Project Naming

**Format**: `{project-name}` or `{domain}-tool`

**In package.json**: Use kebab-case

```json
{
  "name": "@yourorg/project-name",
  "version": "1.0.0"
}
```

**In conversation/docs**: Lowercase, hyphenated
- "Install the project-name tool to get started"
- "The tool supports the system's scripting language"

### Module Naming

**Format**: `{function}-{domain}` in kebab-case

Examples:
- `search-query` (not `searchQuery`, `SearchQuery`, or `search_query`)
- `environment-setup`
- `code-compiler`
- `code-review-security`

**In MODULE.md filenames**: Match the directory name exactly

```
modules/
├── search-query/
│   └── MODULE.md
├── environment-setup/
│   └── MODULE.md
```

### Component/Persona Naming

**Format**: `{role}-{domain}` in kebab-case

Examples:
- `core-developer`
- `api-developer`
- `security-auditor`

**In markdown filenames**: `{role}-{domain}.md`

```
configs/
├── core-developer.md
├── api-developer.md
```

### Service Naming

**Format**: `{domain}-{function}` in kebab-case

Examples:
- `project-search`
- `project-explorer`
- `data-search`
- `data-explorer`

**In services.json**: Match this convention

```json
{
  "project-search": {
    "command": "node",
    "args": ["${BUILD_ROOT}/services/local-search.js"]
  }
}
```

### Template Naming

**Format**: Descriptive, kebab-case

Examples:
- `basic-app`
- `rest-api`
- `fullstack-app`
- `library-scaffold`

**In directory structure**:

```
templates/
├── basic-app/
├── rest-api/
├── fullstack-app/
```

### Command Naming

**Format**: `/verb-noun` in kebab-case

Examples:
- `/new-project`
- `/deploy-service`
- `/run-tests`

**Rationale**: Slash commands should be imperative and action-oriented. Hyphens for readability.

**Directory Structure**: Group commands by functional domain

```
commands/
├── project/
│   ├── new.md
│   └── scaffold-template.md
├── build/
│   ├── deploy.md
│   ├── verify.md
│   └── compile.md
├── test/
│   ├── run.md
│   └── coverage-report.md
└── network/
    ├── start-service.md
    └── reset-state.md
```

**Naming Convention**:
- Directory names: singular, kebab-case (`project/`, not `projects/`)
- File names: match the command exactly (`coverage-report.md` for `/coverage-report`)
- Don't repeat the domain in the file name (e.g. `commands/build/deploy.md` not `commands/build/deploy-build.md`).
- Keep flat structure: one level of nesting maximum

**Anti-patterns**:
- ❌ Deep nesting: `commands/project/scaffolding/new/new-project.md`
- ✅ Correct: `commands/project/new.md`
- ❌ Plural directories: `commands/builds/deploy.md`
- ✅ Correct: `commands/build/deploy.md`
- ❌ Repeating the domain: `commands/build/deploy-build.md`
- ✅ Correct: `commands/build/deploy.md`

**Rationale**: Grouping by domain makes commands discoverable while keeping the structure simple. Flat hierarchy prevents navigation hell. Singular directory names match common CLI conventions.

## Voice & Tone

### Documentation

- **Conversational but precise**: "This module queries your local knowledge base" not "This module facilitates knowledge retrieval operations"
- **Active voice**: "The compiler detects vulnerabilities" not "Vulnerabilities are detected by the compiler"
- **No corporate-speak**: Avoid "leverage," "utilize," "synergize," "ecosystem players"
- **Embrace builder language**: "Ship it," "dogfood," "it just works"

### Error Messages

- **Direct & actionable**: "Build failed: Missing '@example/common-lib'. Run `npm install @example/common-lib`."
- **No blame**: Don't say "You forgot to..." or "Invalid input provided." Say what's wrong and how to fix it.
- **Context-aware**: If the API is down, say so. Don't return a cryptic stack trace.

### Code Comments

- **Comment the why**: `// Cache old blocks indefinitely since they're immutable`
- **Not the what**: `// Set cache to true` (useless)
- **Personality allowed**: `// TODO: This is janky but works. Refactor when it breaks.`

## Anti-Patterns to Avoid

❌ **Inconsistent casing**: `My-Project`, `myProject`, `MY_PROJECT`
✅ **Correct**: `my-project`

❌ **Verbose names**: `project-domain-data-explorer-service`
✅ **Correct**: `project-explorer`

❌ **Corporate jargon**: "The tool facilitates development workflows"
✅ **Correct**: "The tool makes development less painful"

❌ **Vague errors**: "Operation failed"
✅ **Correct**: "API connection failed: https://api.example.com returned 503"

❌ **Shouting**: `SEARCH_QUERY`, `ENVIRONMENT_SETUP`
✅ **Correct**: `search-query`, `environment-setup`

## When to Break the Rules

- **Start of sentences**: Grammatically required capitalization is fine
- **Proper nouns in external docs**: If referencing official branding that uses different casing, match it in quotes
- **Code where convention differs**: Environment variables (`MY_API_URL`), constants in code (`MAX_RETRIES`)

**Guiding principle**: Consistency matters more than rigidity. If breaking a rule makes something clearer or more usable, document the exception and move on.

## Governance

### Amendment Procedure

- **Proposal**: Any change to the constitution must be documented with rationale and impact analysis
- **Version Bump**: Follow semantic versioning (MAJOR for breaking changes, MINOR for additions, PATCH for clarifications)
- **Sync Propagation**: All template files and dependent documentation must be updated before ratification
- **Approval**: Constitution changes require explicit approval and commit message documenting the change

### Compliance & Review

- **Constitution Supersedes All**: When conflicts arise between constitution and other practices, constitution wins
- **Continuous Validation**: All PRs/reviews must verify compliance with constitutional principles
- **Complexity Justification**: Any deviation from simplicity principles must be explicitly justified
- **Regular Review**: Constitution should be reviewed during major milestones or when friction is detected

### Development Guidance

This constitution provides the non-negotiable governance framework. For runtime development guidance, workflow instructions, and implementation patterns, refer to agent-specific guidance files and template documentation.

**Version**: 1.0.0 | **Ratified**: 2025-11-12 | **Last Amended**: 2025-11-12

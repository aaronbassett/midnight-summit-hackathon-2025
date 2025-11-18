# Contributing to pod Plugin

Thank you for your interest in contributing to the pod Plugin! This document provides guidelines for contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Constitutional Compliance](#constitutional-compliance)

## Getting Started

### Prerequisites

- Node.js 24.11.0+ (LTS)
- Git
- Claude Code (for testing)
- Chroma Cloud access (for knowledge base updates)

### Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/yourusername/pod-rigging.git
   cd pod-rigging
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/original/pod-rigging.git
   ```

4. **Install dependencies and build** (CRITICAL):

   ```bash
   cd midnight-plugin/servers
   pnpm install
   pnpm build
   cd ../..
   ```

   > **Important**: The servers package requires dependencies and must be built before use. Without this, the MCP server will fail to start with "Cannot find module" errors.

5. **Install plugin for testing**:

   ```bash
   # Create symlink for development
   ln -s $(pwd)/midnight-plugin ~/.claude/plugins/midnight-plugin
   ```

6. **Set up development environment**:

   See [DEVELOPMENT.md](DEVELOPMENT.md) for additional setup including:
   - Knowledge base configuration
   - Testing procedures
   - Build and release process

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch Naming Convention**:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Follow the [Code Standards](#code-standards)
- Write tests for new functionality
- Update documentation as needed
- Test thoroughly before committing

### 3. Commit Your Changes

Follow the [Commit Guidelines](#commit-guidelines) for commit message format.

### 4. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 5. Create a Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Select your feature branch
- Fill out the PR template (see [Pull Request Process](#pull-request-process))

## Code Standards

### File Organization

**CRITICAL**: Respect the plugin directory boundary (see [constitution](.specify/memory/constitution.md)):

- **Runtime files ONLY** in `midnight-plugin/`:
  - `.mcp.json` - MCP server configuration
  - `skills/` - Skill definitions (plain files)
  - `servers/` - Servers package with its own package.json
    - `dist/` - Compiled servers (runtime)
    - `node_modules/` - Server dependencies (runtime)

- **Build artifacts** (NOT committed to git):
  - `servers/dist/` - TypeScript compiled output
  - `servers/node_modules/` - Package dependencies

- **Everything else** at repository root:
  - Documentation (`README.md`, `DEVELOPMENT.md`, `CONTRIBUTING.md`)
  - Build scripts (`scripts/`)
  - Tests outside packages (`tests/`)

### Code Style

- **Naming**: Use kebab-case for files and directories
  - Good: `midnight-rag.js`, `rag-query/`
  - Bad: `podRAG.js`, `ragQuery/`

- **Indentation**: 2 spaces (no tabs)

- **Comments**: Comment the _why_, not the _what_

  ```javascript
  // Good: Cache old blocks indefinitely since they're immutable
  // Bad: Set cache to true
  ```

- **Voice**: Conversational but precise (see constitution)
  - Good: "This skill queries your local knowledge base"
  - Bad: "This skill facilitates knowledge retrieval operations"

### Brand Name: "pod network"

**CRITICAL**: Always lowercase, even at sentence start. See [CLAUDE.md](CLAUDE.md) for complete branding rules.

- ✅ "pod network"
- ❌ "Pod Network", "Pod", "POD"

## Testing Requirements

### Before Submitting

1. **Run automated tests**: Ensure all tests pass

   ```bash
   cd midnight-plugin/servers
   pnpm test
   cd ../..
   ```

   If tests fail, fix the issues before submitting your PR.

2. **Manual testing**: Test the plugin in Claude Code
   - Ensure build is up to date: `cd midnight-plugin/servers && pnpm build && cd ../..`
   - Install your changes: `ln -s $(pwd)/midnight-plugin ~/.claude/plugins/midnight-plugin`
   - Restart Claude Code
   - Test affected functionality

3. **MCP server testing**: Test server directly (see [DEVELOPMENT.md](DEVELOPMENT.md#testing))

   ```bash
   cd midnight-plugin/servers
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node dist/rag/index.js
   ```

4. **Integration testing**: Test realistic workflows
   - Ask sample questions
   - Verify source citations
   - Check response times (<3s)

### Writing Tests

If you add new functionality, consider adding tests:

- **Structure tests**: Validate new files exist and are formatted correctly
- **Unit tests**: Test individual functions or modules in isolation
- **Integration tests**: Test end-to-end workflows with test database

See existing tests in `tests/` for examples.

## Commit Guidelines

### Format

Follow **Conventional Commits**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature (new Skill, MCP tool, etc.)
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring (no behavior change)
- `test`: Adding or updating tests
- `chore`: Maintenance, dependencies, tooling
- `perf`: Performance improvement

### Examples

```
feat(rag-query): add hybrid search with keyword fallback

Implement fallback to keyword search when semantic search returns
no results above relevance threshold.

Closes #123
```

```
fix(midnight-rag): handle empty knowledge base gracefully

Return helpful error message when collection is missing instead
of crashing the MCP server.
```

```
docs(readme): update installation instructions

Clarify that Node.js 24.11.0+ is required and add troubleshooting
section for common installation issues.
```

### Commit Message Guidelines

- **Subject line**:
  - Max 50 characters
  - Lowercase, no period at end
  - Imperative mood ("add" not "added" or "adds")

- **Body**:
  - Wrap at 72 characters
  - Explain _what_ and _why_, not _how_
  - Reference issues: "Closes #123", "Fixes #456"

## Pull Request Process

### Before Creating PR

1. **Sync with upstream**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run checks**:
   - Automated tests passing (`npm test`)
   - Manual testing complete
   - Server tests passing
   - No linter errors (if linter added)

3. **Update documentation**:
   - Update `README.md` if user-facing changes
   - Update `DEVELOPMENT.md` if maintainer changes
   - Update specs if architecture changes

### PR Template

When creating your PR, include:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation
- [ ] Chore/maintenance

## Testing

Describe how you tested your changes:

- [ ] Automated tests pass (`npm test`)
- [ ] Tested in Claude Code
- [ ] Manual server testing
- [ ] Integration testing

## Checklist

- [ ] Code follows project style guidelines
- [ ] Respects plugin directory boundary
- [ ] Brand name "pod network" always lowercase
- [ ] Commit messages follow convention
- [ ] Documentation updated (if needed)
- [ ] Tested thoroughly
- [ ] Ready for review

## Related Issues

Closes #(issue number)
```

### Review Process

1. **Automated checks**: CI runs tests and validation checks
   - All tests must pass
   - Plugin structure validation
   - JSON syntax validation
   - Script syntax validation
2. **Code review**: Maintainer will review for:
   - Constitutional compliance
   - Code quality and style
   - Test coverage
   - Documentation updates
3. **Feedback**: Address review comments
4. **Approval**: Maintainer approves and merges

### After Merge

- Delete your feature branch (locally and on fork)
- Sync your fork with upstream
- Celebrate! 🎉

## Constitutional Compliance

All contributions must comply with [`.specify/memory/constitution.md`](.specify/memory/constitution.md).

### Key Principles

**I. Ship Fast, Fix What Hurts**

- Build the smallest useful thing
- Dogfood it immediately
- Iterate based on real pain

**III. Simplicity & Pragmatism**

- Do the simplest thing that could work
- No speculative features (YAGNI)
- Dependencies must earn their keep

**VI. User Experience First**

- Frictionless setup
- Human-readable errors
- Actionable feedback

### Compliance Checklist

Before submitting PR, verify:

- [ ] **Simplicity**: Is this the simplest solution?
- [ ] **Boundary**: Are files in the right place (plugin vs root)?
- [ ] **Naming**: Kebab-case, lowercase, no corporate-speak?
- [ ] **Documentation**: Clear, conversational, actionable?
- [ ] **Branding**: "pod network" always lowercase?
- [ ] **Comments**: Explain _why_, not _what_?

## Questions?

- **For usage questions**: See [README.md](README.md)
- **For development setup**: See [DEVELOPMENT.md](DEVELOPMENT.md)
- **For governance questions**: See [constitution](.specify/memory/constitution.md)
- **For runtime guidance**: See [CLAUDE.md](CLAUDE.md)
- **For issues**: Open an issue on GitHub

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to pod Plugin! Your help makes the project better for everyone.

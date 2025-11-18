# Justfile Quick Reference

This project uses [just](https://just.systems/) as a task runner for common development workflows.

## Installation

If you don't have `just` installed:

```bash
# macOS
brew install just

# Linux
curl --proto '=https' --tlsv1.2 -sSf https://just.systems/install.sh | bash -s -- --to /usr/local/bin

# Windows
scoop install just

# Or via cargo
cargo install just
```

## Quick Start

```bash
# Show all available commands
just

# Or
just --list
```

## Common Commands

### Before Committing

```bash
# Run all pre-commit checks (recommended)
just pre-commit

# Quick check without running tests (faster)
just quick-check

# Auto-fix formatting and linting issues
just pre-commit-fix
```

### Testing

```bash
# Run all tests
just test

# Run reranking tests only
just test-reranking

# Run specific test suite
just test-reranker
just test-queue
just test-integration

# Watch mode
just test-watch
just test-reranking-watch
```

### Code Quality

```bash
# Format code
just format

# Check formatting without changes
just format-check

# Lint code
just lint

# Lint and auto-fix
just lint-fix

# Type check TypeScript
just type-check
```

### Building

```bash
# Build TypeScript
just build

# Clean build artifacts
just clean

# Clean and rebuild
just rebuild
```

### CI Simulation

```bash
# Simulate the full CI pipeline locally
just ci
```

## Command Categories

- **Testing**: `test`, `test-reranking`, `test-reranker`, `test-queue`, `test-integration`, `test-watch`, `test-coverage`, `test-ui`
- **Code Quality**: `lint`, `lint-fix`, `format`, `format-check`, `type-check`
- **Pre-commit**: `pre-commit`, `pre-commit-fix`, `quick-check`, `validate`
- **Build**: `build`, `clean`, `rebuild`
- **Development**: `dev-rag`, `install`, `update`
- **CI/CD**: `ci`
- **Validation**: `validate-plugin`, `validate-fixtures`
- **Documentation**: `tree`, `show-tests`, `metrics`

## Typical Workflows

### Before committing changes:

```bash
just pre-commit-fix  # Auto-fix issues
just pre-commit      # Validate everything
```

### Working on tests:

```bash
just test-reranking-watch  # Watch mode for reranking tests
```

### Debugging CI failures locally:

```bash
just ci  # Run exact CI pipeline
```

### Quick validation (skip tests):

```bash
just quick-check  # Fast feedback
```

## Environment

The justfile automatically handles:

- Running commands in the correct directories
- Using the right package managers (npm for root, pnpm for servers)
- Colored output and progress indicators
- Error handling and exit codes

## More Information

Run `just <command>` for any recipe, or see the `justfile` in the repository root for implementation details.

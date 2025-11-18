# Testing Guide

This project includes comprehensive testing, linting, formatting, and type checking infrastructure.

## Quick Start

```bash
# Install just command runner (if not already installed)
brew install just

# Run all quality checks
just ci

# Run tests
just test

# Run tests in watch mode
just test-watch

# Run linting
just lint

# Fix linting issues
just lint-fix

# Check formatting
just format-check

# Fix formatting
just format

# Type check
just typecheck
```

## Testing Infrastructure

### Test Framework
- **Vitest**: Fast, modern test runner with native TypeScript support
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Custom DOM matchers

### Test Files
- `src/lib/mutations/engine.test.ts` - Mutation engine tests (~25 test cases)
- `src/lib/utils/retry.test.ts` - Retry utility tests (~15 test cases)

### Running Tests

```bash
# Run all tests
pnpm run test

# Watch mode
pnpm run test:watch

# With UI
pnpm run test:ui
```

## Code Quality

### Linting (ESLint)
- Configured with TypeScript support
- React hooks linting
- Unused variables treated as errors (breaking build)
- Maximum 38 warnings allowed (existing technical debt)

```bash
pnpm run lint          # Check for linting errors
pnpm run lint:fix      # Auto-fix linting issues
```

### Formatting (Prettier)
- Consistent code style across the project
- Runs on all `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, and `.md` files

```bash
pnpm run format        # Fix formatting
pnpm run format:check  # Check formatting without changes
```

### Type Checking (TypeScript)
- Strict mode enabled
- No emit (type checking only)

```bash
pnpm run typecheck
```

## CI/CD

### GitHub Actions Workflow
File: `.github/workflows/ci.yml`

Runs on all PRs and pushes to `main` and `dev` branches:
1. **Test Job**
   - Format checking
   - Linting
   - TypeScript type checking
   - Test execution

2. **Build Job** (runs after tests pass)
   - Build application
   - Upload build artifacts

### Local CI Check
Run the same checks that GitHub Actions runs:

```bash
pnpm run ci
# Or using just:
just ci
```

## Just Commands

The `justfile` provides convenient aliases for common tasks:

```bash
just test           # Run tests
just test-watch     # Run tests in watch mode
just test-ui        # Run tests with UI
just lint           # Run linting
just lint-fix       # Fix linting issues
just format-check   # Check formatting
just format         # Fix formatting
just typecheck      # Run TypeScript type checking
just ci             # Run all CI checks
just dev            # Run development server
just build          # Build for production
just clean          # Clean build artifacts
just fresh          # Clean and reinstall
```

## Writing Tests

### Test Structure
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Mocking
```typescript
// Mock Math.random
vi.spyOn(Math, 'random').mockReturnValue(0.5);

// Mock timers
vi.useFakeTimers();
await vi.advanceTimersByTimeAsync(1000);
vi.useRealTimers();

// Mock functions
const mockFn = vi.fn().mockResolvedValue('result');
```

### Best Practices
1. **Focus on behavior**: Test what the code does, not how it does it
2. **Avoid over-mocking**: Only mock external dependencies
3. **Test edge cases**: Empty strings, null, undefined, boundary values
4. **Use descriptive test names**: "should do X when Y"
5. **Keep tests isolated**: Each test should be independent

## Test Coverage

Current tests focus on:
- **Mutation Engine** (`src/lib/mutations/engine.ts`): 28 tests for pure functions handling prompt mutations
- **Retry Utility** (`src/lib/utils/retry.ts`): 14 tests for exponential backoff and retry logic

**Total**: 42 tests passing across 2 test files

## Continuous Improvement

### Adding New Tests
1. Create test file next to source file: `feature.test.ts`
2. Import Vitest utilities
3. Write focused, meaningful tests
4. Run tests locally before pushing
5. Ensure CI passes

### Updating Linting Rules
Edit `eslint.config.js` to add or modify rules.

### Updating Formatting Rules
Edit `.prettierrc` to adjust code style preferences.

## Troubleshooting

### Tests Failing
```bash
# Clear cache and re-run
rm -rf node_modules coverage dist
pnpm install
pnpm run test
```

### Linting Errors
```bash
# Try auto-fix first
pnpm run lint:fix

# If issues persist, check eslint.config.js
```

### Formatting Issues
```bash
# Auto-format all files
pnpm run format
```

### Type Errors
```bash
# Run type check with detailed output
pnpm run typecheck
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Just Command Runner](https://github.com/casey/just)

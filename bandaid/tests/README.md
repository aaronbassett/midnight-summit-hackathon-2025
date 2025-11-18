# Bandaid Test Suite

Automated test suite for the Bandaid LLM Security Proxy.

## Overview

This test suite provides comprehensive coverage of critical security components:
- Pattern detection (regex-based threat detection)
- Confidence threshold decision logic
- Validation orchestration
- Security hooks (pre-call blocking, post-call leak detection)
- Event storage and querying
- End-to-end validation flows

## Test Structure

```
tests/
├── conftest.py              # Shared fixtures and test data
├── utils.py                 # Test utility functions
├── unit/
│   ├── security/           # Security validator tests
│   │   ├── test_patterns.py      # Pattern detection (regex)
│   │   ├── test_confidence.py    # Confidence thresholds
│   │   ├── test_validators.py    # Validation orchestrator
│   │   └── test_redactor.py      # PII redaction
│   ├── proxy/              # Proxy and hooks tests
│   │   └── test_hooks.py         # LiteLLM hooks
│   └── storage/            # Storage layer tests
│       └── test_events_db.py     # SQLite database
└── integration/            # End-to-end tests
    └── test_validation_flow.py   # Complete validation flows
```

## Running Tests

### Install Dependencies

```bash
pip install -e ".[dev]"
```

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=bandaid --cov-report=term-missing
```

### Run Specific Test Files

```bash
# Security tests only
pytest tests/unit/security/

# Pattern detection tests
pytest tests/unit/security/test_patterns.py

# Integration tests
pytest tests/integration/
```

### Run Specific Tests

```bash
# Run a specific test class
pytest tests/unit/security/test_patterns.py::TestPromptInjectionDetection

# Run a specific test method
pytest tests/unit/security/test_patterns.py::TestPromptInjectionDetection::test_ignore_previous_instructions
```

## Testing Philosophy

### What We Test

✅ **Real Logic** - Test actual business logic, algorithms, and decision-making
✅ **Real Databases** - Use in-memory SQLite and ChromaDB for storage tests
✅ **Real Patterns** - Test against actual threat patterns and edge cases
✅ **Real Flows** - Test complete request → validation → decision → logging flows

### What We Mock

❌ **ML Models** - Mock transformer models (too heavy for CI/CD)
❌ **External APIs** - Mock LiteLLM and provider APIs
❌ **Heavy Resources** - Mock components that require significant memory/time

## Test Coverage

Current target: **50-70% coverage**

- Coverage is reported in CI but does NOT block builds
- Focus is on testing critical security paths thoroughly
- Informational metric to guide future test development

## Key Test Cases

### Pattern Detection (`test_patterns.py`)
- Prompt injection patterns (20+ variants)
- Blockchain addresses (Ethereum, Bitcoin)
- Private keys (WIF format, PEM format)
- API keys (OpenAI, Anthropic, AWS, Google)
- BIP39 seed phrases (12/18/24 words)

### Confidence Logic (`test_confidence.py`)
- Threshold classification (high/medium/low)
- Action determination (block/validate/log/allow)
- Severity mapping
- Multi-detector aggregation

### Validation Flow (`test_validators.py`)
- High confidence threats blocked
- Low confidence threats allowed
- Medium confidence triggers Guard
- Multiple threat type detection
- Event logging
- Error handling

### Security Hooks (`test_hooks.py`)
- Text extraction from chat/completion/embedding requests
- Blocking logic based on validation
- Streaming chunk reconstruction
- Leak detection
- Request/response correlation

### Database (`test_events_db.py`)
- Event CRUD operations
- Filtering (by type, threat, severity, time)
- Pagination
- Statistics aggregation
- Retention cleanup
- Pattern metadata

### Integration (`test_validation_flow.py`)
- Complete request → block/allow → database flow
- Multiple requests tracked independently
- Real database querying
- Statistics accuracy

## Continuous Integration

### GitHub Actions

Two workflows run on every push and PR:

1. **Tests** (`.github/workflows/tests.yml`)
   - Runs on Python 3.11 and 3.12
   - Executes full test suite
   - Generates coverage report (informational)
   - Does NOT fail on coverage threshold

2. **Ruff** (`.github/workflows/ruff.yml`)
   - Runs linting checks
   - Runs format checks
   - Ensures code quality

## Writing New Tests

### Example Test Structure

```python
import pytest
from bandaid.security.patterns import PatternDetector

class TestNewFeature:
    """Test description."""

    @pytest.fixture
    def detector(self):
        return PatternDetector()

    def test_specific_behavior(self, detector):
        """Test a specific behavior."""
        result = detector.detect_all("test input")
        assert len(result) > 0
```

### Best Practices

1. **Test Real Logic** - Don't just test mocks
2. **Use Fixtures** - Leverage shared fixtures from `conftest.py`
3. **Clear Names** - Use descriptive test names
4. **Edge Cases** - Test boundaries and error conditions
5. **Async Tests** - Use `@pytest.mark.asyncio` for async functions
6. **Isolation** - Tests should be independent

## Fixtures Available

From `conftest.py`:

- `test_config` - Full configuration with all validators
- `minimal_config` - Minimal configuration (regex only)
- `events_db` - In-memory SQLite database
- `pattern_store` - In-memory ChromaDB store
- `mock_ner_pipeline` - Mock NER model
- `mock_guard_model` - Mock Guard model
- `mock_sentence_transformer` - Mock embeddings model
- `sample_injection_prompts` - Real injection patterns
- `sample_pii_data` - Sample PII data
- `sample_blockchain_addresses` - Real crypto addresses
- `sample_private_keys` - Sample key patterns
- `sample_api_keys` - Sample API key formats
- `sample_seed_phrases` - Valid BIP39 phrases

## Common Issues

### Import Errors

Make sure bandaid is installed in development mode:
```bash
pip install -e .
```

### Async Test Errors

Use `@pytest.mark.asyncio` decorator for async tests:
```python
@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None
```

### Database Lock Errors

Use in-memory databases for tests (`:memory:`) to avoid lock issues.

## Future Enhancements

Potential areas for expansion:
- [ ] Pattern store (ChromaDB) unit tests
- [ ] Learning/embedder component tests
- [ ] Dashboard API endpoint tests
- [ ] Config management tests
- [ ] Performance benchmarks
- [ ] Stress/load tests

## Questions?

Check the main project documentation or open an issue on GitHub.

# bandaid Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-12

## Active Technologies
- Python 3.11+ + FastAPI, LiteLLM, guardrails-ai (to be added), httpx, pydantic (002-guardrails-ai-integration)
- SQLite (via aiosqlite) for validator configuration/state, existing ChromaDB for pattern learning (002-guardrails-ai-integration)

- Python 3.11+ + FastAPI, LiteLLM, transformers (Llama-Guard-3-8B), dslim/bert-base-NER, sentence-transformers (all-MiniLM-L6-v2), ChromaDB (embedded), SQLite, Typer/Click, Sentry SDK (001-llm-security-proxy)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Python 3.11+: Follow standard conventions

## Recent Changes
- 002-guardrails-ai-integration: Added Python 3.11+ + FastAPI, LiteLLM, guardrails-ai (to be added), httpx, pydantic

- 001-llm-security-proxy: Added Python 3.11+ + FastAPI, LiteLLM, transformers (Llama-Guard-3-8B), dslim/bert-base-NER, sentence-transformers (all-MiniLM-L6-v2), ChromaDB (embedded), SQLite, Typer/Click, Sentry SDK

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->

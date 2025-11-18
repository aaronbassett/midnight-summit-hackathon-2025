# Implementation Plan: Guardrails AI Validator Integration

**Branch**: `002-guardrails-ai-integration` | **Date**: 2025-11-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-guardrails-ai-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add optional Guardrails AI Hub integration to the LLM security proxy, enabling administrators to download and configure pre-built validators from the Guardrails Hub. Validators run as additional security layers alongside existing built-in detection, with results integrated into the existing confidence score system. System must gracefully degrade to built-in security when Guardrails is not configured or unavailable.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI, LiteLLM, guardrails-ai (to be added), httpx, pydantic
**Storage**: SQLite (via aiosqlite) for validator configuration/state, existing ChromaDB for pattern learning
**Testing**: pytest with pytest-asyncio
**Target Platform**: Linux/macOS server (existing deployment target)
**Project Type**: Single (existing src/ structure)
**Performance Goals**: Maintain <100ms p50 latency added by proxy; validators timeout at 10 seconds (configurable)
**Constraints**: Must gracefully degrade when Guardrails unavailable; validators run sequentially; validator dependencies isolated via remote inference mode (validates calls to Guardrails API rather than local model execution, avoiding package conflicts)
**Scale/Scope**: Support 1000+ concurrent requests with multiple validators (recommended: 3-5 validators for optimal performance)
**Dependency Isolation Strategy**: Use Guardrails remote inference by default (validators execute via API calls to Guardrails Hub). This prevents dependency conflicts with existing security stack (transformers, sentence-transformers) while maintaining functionality. Local validator execution optional but not required for v1.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Ship Fast, Fix What Hurts
- ✅ **PASS**: Feature is optional - ships without disrupting existing functionality
- ✅ **PASS**: Can dogfood immediately - admins can enable/test Guardrails without affecting core proxy
- ⚠️ **REVIEW**: Complexity justified - adding third-party validator integration adds dependencies and abstraction layers

### Principle II: Build for Joy, Not Scale
- ✅ **PASS**: User experience first - CLI-based management, clear error messages
- ✅ **PASS**: Responsive & predictable - validators timeout rather than hang indefinitely
- ✅ **PASS**: Good enough ships - using existing Guardrails library instead of building custom validator framework

### Principle III: Simplicity & Pragmatism (KISS & YAGNI)
- ⚠️ **REVIEW**: Adds new dependency (guardrails-ai) - must justify against building simple wrapper for specific validators
- ✅ **PASS**: No speculative features - only Hub integration and validator execution, no custom validator building
- ✅ **PASS**: Minimal complexity - reuses existing confidence score system and logging infrastructure

### Principle IV: Make It Work, Then Make It Fast
- ✅ **PASS**: Correctness first - validators execute with timeouts and error handling before optimization
- ✅ **PASS**: No premature optimization - sequential execution acceptable for v1, can parallelize later if needed

### Principle V: Modularity & Single Responsibility
- ✅ **PASS**: Single purpose - new guardrails module handles only Guardrails integration, not generic validators
- ✅ **PASS**: Composable design - integrates into existing security layer chain

### Principle VI: User Experience First
- ✅ **PASS**: Frictionless setup - optional feature with clear error messages when misconfigured
- ✅ **PASS**: Actionable feedback - validator installation/execution errors provide clear next steps
- ✅ **PASS**: Empathetic design - graceful degradation when Guardrails unavailable

### Testing Standards
- ✅ **PASS**: Integration tests planned - test against Guardrails Hub API or mock service
- ✅ **PASS**: Real workflows - test validator installation, configuration, and execution in proxy flow

### Complexity Justification Required
**Violation**: Adding guardrails-ai dependency and abstraction layer for validator management
**Why Needed**: Guardrails Hub provides ecosystem of pre-built validators; maintaining our own would be higher maintenance burden
**Simpler Alternative Rejected**: Building simple wrappers for 2-3 specific validators - would not scale to user needs and would require ongoing maintenance as validators evolve

**GATE RESULT**: ✅ **CONDITIONAL PASS** - Proceed to Phase 0 research. Must verify Guardrails library provides sufficient value over custom implementation and confirm isolation/dependency strategy prevents conflicts with existing security stack.

---

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion*

### Principle I: Ship Fast, Fix What Hurts
- ✅ **PASS**: Design uses remote inference by default - ships without heavy ML dependencies
- ✅ **PASS**: Clear installation path via CLI - can dogfood within minutes
- ✅ **PASS**: Complexity justified - leveraging Guardrails ecosystem (100+ validators) vs building from scratch

### Principle III: Simplicity & Pragmatism (KISS & YAGNI)
- ✅ **PASS**: Research confirmed Guardrails library provides significant value:
  - 100+ pre-built validators available
  - Remote inference isolates dependencies
  - Standard pip packaging (familiar tooling)
  - Active community and updates
- ✅ **PASS**: Simpler alternative (custom validators) would require:
  - Building validator abstraction layer
  - Maintaining 3-5+ validators ourselves
  - Handling dependency conflicts manually
  - Managing model updates
  - **Rejected** - higher ongoing maintenance burden

### Principle V: Modularity & Single Responsibility
- ✅ **PASS**: Design follows existing pattern:
  - `guardrails_validator.py` mirrors `guard_validator.py` and `ner_validator.py`
  - Integrates into existing security pipeline
  - Single responsibility: Guardrails integration only

### Complexity Justification - VALIDATED
**Original Concern**: Adding guardrails-ai dependency and abstraction layer
**Post-Design Verdict**: ✅ **JUSTIFIED**
**Evidence**:
- Remote inference mode prevents dependency conflicts (research confirmed)
- Guardrails Hub provides 100+ validators vs 3-5 we'd build ourselves
- Lower maintenance: Guardrails team maintains validators, we just integrate
- Existing patterns: Same abstraction level as `guard_validator.py`
- Performance acceptable: <50ms latency with remote inference (within <100ms budget)

**FINAL GATE RESULT**: ✅ **PASS** - Design adheres to constitution. Complexity is justified by ecosystem value and remote inference isolation strategy. Proceed to implementation (Phase 2).

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
src/bandaid/
├── models/
│   ├── events.py           # Existing - extend for Guardrails events
│   └── guardrails.py       # NEW - Guardrails-specific models
├── security/
│   ├── validators.py       # Existing - extend to include Guardrails
│   ├── patterns.py         # Existing
│   ├── confidence.py       # Existing - reuse for mapping severity to confidence
│   └── guardrails_validator.py  # NEW - Guardrails integration
├── storage/
│   ├── events_db.py        # Existing - extend schema for validator config
│   └── migrations.py       # Existing - add migrations for new tables
├── cli_commands/
│   ├── setup.py            # Existing - extend for Guardrails setup
│   └── guardrails.py       # NEW - Guardrails management commands
├── config.py               # Existing - extend with Guardrails settings
└── proxy/
    └── hooks.py            # Existing - integrate Guardrails validators

tests/
├── unit/
│   ├── security/
│   │   └── test_guardrails_validator.py  # NEW
│   └── storage/
│       └── test_guardrails_db.py         # NEW
└── integration/
    └── test_guardrails_flow.py           # NEW
```

**Structure Decision**: Single project structure maintained. New Guardrails functionality integrates into existing modules (`security/`, `storage/`, `cli_commands/`) following the established pattern of one module per security layer. The `guardrails_validator.py` module mirrors the structure of `guard_validator.py` and `ner_validator.py`, ensuring consistency.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

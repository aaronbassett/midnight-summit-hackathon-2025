# Implementation Plan: Private Access Purchase System

**Branch**: `001-private-access-purchase` | **Date**: 2025-11-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-private-access-purchase/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a privacy-preserving access purchase system using Midnight blockchain's zero-knowledge proof capabilities. Users purchase one-time or subscription access to services via token transfers and receive on-chain proof IDs. Vendors verify access using proof IDs that reveal only a binary grant/deny decision - no buyer information, payment amounts, or purchase types are disclosed. CLI tool handles all purchase and verification operations.

## Technical Context

**Language/Version**: TypeScript 5.x (Midnight SDK compatibility)
**Primary Dependencies**: @midnight-ntwrk/compact-runtime, @midnight-ntwrk/ledger, @midnight-ntwrk/zswap, @midnight-ntwrk/wallet, @midnight-ntwrk/midnight-js-contracts
**Storage**: On-chain ledger state (Map<ProofId, AccessProof>); @midnight-ntwrk/midnight-js-level-private-state-provider for local state
**Testing**: Vitest + @midnight-ntwrk/midnight-js-testing (Docker-based test environment)
**Target Platform**: Node.js CLI tool; Midnight blockchain testnet with local devnet for development
**Project Type**: Single project (CLI + smart contracts)
**Performance Goals**: Proof verification <5 seconds; purchase flow <2 minutes; support 100 concurrent transactions
**Constraints**: Zero-knowledge property must be maintained (no information leakage); exact token amount validation; 30-day subscription expiration accuracy within 1 minute
**Scale/Scope**: Hackathon MVP - single vendor, CLI-only interface, P1 user story minimum (one-time access)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. MVP Speed ✅ PASS

- **MVP First**: P1 user story (one-time access purchase) delivers complete value independently
- **Skip Premature Optimization**: Using Midnight SDK as-is; no custom ZK optimizations
- **Good Enough Architecture**: CLI + smart contracts pattern is familiar and fast to build

### II. Simple But Scalable ✅ PASS

- **Simple Setup**: CLI tool installable via npm; smart contracts deployable to Midnight devnet
- **Environment Config**: `.env` file for contract addresses and network configuration
- **Minimal Dependencies**: Only Midnight SDK + CLI framework; no unnecessary packages
- **Database**: On-chain storage eliminates local database setup complexity

### III. Demo-First Quality ✅ PASS

- **UI Gets Attention**: CLI output formatted for clear demo visibility (purchase confirmations, verification results)
- **Happy Path Priority**: P1 focuses on successful purchase → verify flow; error handling for obvious failures only
- **Basic Validation**: Exact token amount validation prevents demo failures
- **Testing Optional**: Manual CLI testing sufficient for hackathon demo

### Compliance Summary

**Status**: ✅ ALL GATES PASS

No constitution violations. Project aligns with hackathon principles:
- Fast to build (TypeScript + Midnight SDK)
- Simple setup (CLI tool + devnet deployment)
- Demo-focused (visible purchase/verify flows)

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
midnight-contracts/
└── access-control-dapp/
    ├── src/
    │   ├── contract/
    │   │   ├── AccessControl.ts         # Main ZK contract for proof generation/verification
    │   │   ├── VendorConfig.ts          # Vendor pricing and configuration
    │   │   └── types.ts                 # Shared contract types
    │   ├── cli/
    │   │   ├── commands/
    │   │   │   ├── purchase.ts          # Purchase command (one-time/subscription)
    │   │   │   ├── verify.ts            # Vendor verification command
    │   │   │   ├── set-price.ts         # Vendor price configuration
    │   │   │   └── check-status.ts      # Check proof status
    │   │   ├── index.ts                 # CLI entry point
    │   │   └── utils.ts                 # CLI helpers and formatting
    │   ├── services/
    │   │   ├── ProofService.ts          # Proof generation and verification logic
    │   │   ├── TokenService.ts          # Token transfer handling
    │   │   └── StorageService.ts        # On-chain storage interactions
    │   └── models/
    │       ├── AccessPurchase.ts        # Purchase data model
    │       ├── AccessProof.ts           # Proof data model
    │       └── VendorConfig.ts          # Vendor configuration model
    ├── package.json
    ├── tsconfig.json
    └── .env.example

tests/                                   # Optional for hackathon
└── integration/
    ├── purchase-flow.test.ts
    └── verification-flow.test.ts
```

**Structure Decision**: Single project structure using existing `midnight-contracts/access-control-dapp/` directory. Combines smart contracts and CLI tool in one cohesive package. TypeScript throughout for consistency with Midnight SDK.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

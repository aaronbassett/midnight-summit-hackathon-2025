# Changelog

All notable changes to the pod network Claude Code plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Three new specialized agents for pod network development:
  - `midnight-deployment-engineer`: Deployment lifecycle management, multi-environment configuration, contract verification
  - `pod-source-validator`: pod network-specific code validation, SDK usage verification, security checks
  - `pod-test-engineer`: Comprehensive testing infrastructure, CLI tools, and stress testing binaries
- Two new scaffolding skills:
  - `pod-scaffold-contract`: Interactive contract scaffolding with template selection and progressive reference loading
  - `pod-scaffold-dapp`: Full-stack DApp scaffolding including contracts, CLI tools, frontend, and testing infrastructure
- Five new contract templates in `pod-templating` MCP server:
  - `basic-contract`: Minimal starter template demonstrating FastTypes
  - `token-simple`: ERC20-style token with Balance FastType for order-independent transfers
  - `nft-simple`: ERC721-style NFT with SharedCounter for token ID generation
  - `voting-simple`: Simple voting with AddressSet and time-based logic
  - `auction`: Auction contract with Balance FastType and time utilities
- Frontend template for React + Vite + wagmi with pod network integration
- `/#:address-pr-review` slash command to streamline addressing PR review feedback
- `midnight-developer` skill for experienced Solidity developers building on pod network
  - Comprehensive guide to pod network's coordination-free, blockless execution model
  - 5 reference documents covering CRDTs, time handling, Ethereum migration, and external sequencing
  - 3 utility scripts for attestation checking, deployment workflow, and commutativity testing
  - 4 Solidity templates (token, NFT, auction, voting) using pod network FastTypes
- LICENSE file (MIT License)
- CHANGELOG.md to track version history

### Fixed

- Critical security fix: auction contract reentrancy vulnerability in `claimWinningBid()` now follows checks-effects-interactions pattern
- Token and NFT templates now use Balance FastType for `totalSupply` instead of SharedCounter to support burn operations
- Corrected misleading "idempotent" comment in voting template to "Prevent double voting"
- Added clarifying comment for SharedCounter initialization pattern in basic-contract template
- Added security documentation to auction contract's `claimWinningBid()` function
- Enhanced frontend template files with inline comments explaining pod network-specific integration points
- Documented agent integration references (MCP servers vs skills) in midnight-deployment-engineer
- MCP server paths now use `${CLAUDE_PLUGIN_ROOT}` environment variable for correct runtime resolution
- Added LICENSE file to plugin directory
- Enhanced plugin.json with homepage, repository, and structured author metadata

## [1.0.0] - 2024-11-13

### Added

- Initial release
- RAG knowledge base skill for pod network and Solidity development
- Four MCP servers:
  - `midnight-rag`: Semantic search over pod network knowledge base
  - `midnight-reranking`: Result reranking for improved relevance
  - `midnight-network`: Blockchain interaction tools
  - `pod-templating`: Code templating utilities
- Comprehensive query strategies (focused, broad, refined)
- Synonym expansion for blockchain terminology
- Reference documentation for query formulation and search strategies

### Known Issues

- None

[Unreleased]: https://github.com/aaronbassett/pod-rigging/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/aaronbassett/pod-rigging/releases/tag/v1.0.0

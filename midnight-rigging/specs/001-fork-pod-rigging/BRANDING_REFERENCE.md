# Branding Reference: pod network → midnight network

**Created**: 2025-11-17
**Purpose**: Document all naming mappings for consistency during migration

---

## Core Brand Names

| pod network | midnight network |
|-------------|------------------|
| pod network | midnight network |
| pod | midnight |
| the pod network | the midnight network |

**Rule**: Both are ALWAYS lowercase, even at start of sentences

---

## Directory Names

| Original (pod) | New (midnight) |
|----------------|----------------|
| `midnight-plugin/` | `midnight-plugin/` |
| `midnight-plugin/servers/src/midnight-network/` | `midnight-plugin/servers/src/midnight-network/` |

---

## Package Names

| Original (pod) | New (midnight) |
|----------------|----------------|
| `@midnight-plugin/servers` | `@midnight-plugin/servers` |

---

## Server Names (MCP)

| Original (pod) | New (midnight) |
|----------------|----------------|
| `midnight-rag` | `midnight-rag` |
| `midnight-reranking` | `midnight-reranking` |
| `midnight-network` | `midnight-network` |

---

## Skill Names

| Original (pod) | New (midnight) |
|----------------|----------------|
| `pod-scaffold-contract` | `midnight-scaffold-contract` |
| `pod-scaffold-dapp` | `midnight-scaffold-dapp` |
| `midnight-rag-query` | `midnight-rag-query` |
| `midnight-developer` | `midnight-developer` |
| `midnight-deployment-engineer` | `midnight-deployment-engineer` |

---

## Agent Names

| Original (pod) | New (midnight) |
|----------------|----------------|
| `midnight-developer` | `midnight-developer` |
| `midnight-deployment-engineer` | `midnight-deployment-engineer` |

**Note**: pod used Solidity; midnight uses Compact language

---

## Technology Mappings

| pod network | midnight network |
|-------------|------------------|
| Solidity | Compact |
| EVM | Substrate runtime |
| Web3.js / Ethers.js | Polkadot.js |
| ETH | DUST (native token) |
| Mainnet | testnet-02 (current) |
| eth_* RPC methods | chain_* / system_* methods |
| JSON-RPC | JSON-RPC (Substrate) + GraphQL (indexer) |

---

## File Pattern Replacements

### Global Find/Replace Operations

Execute these in order:

1. **Directory renaming** (filesystem operations):
   ```bash
   mv midnight-plugin midnight-plugin
   mv midnight-plugin/servers/src/midnight-network midnight-plugin/servers/src/midnight-network
   ```

2. **Code references** (string replacements in all files):
   - `midnight-plugin` → `midnight-plugin`
   - `midnight-network` → `midnight-network`
   - `midnight-rag` → `midnight-rag`
   - `midnight-reranking` → `midnight-reranking`
   - `midnight-developer` → `midnight-developer`
   - `midnight-deployment-engineer` → `midnight-deployment-engineer`
   - `pod-scaffold-contract` → `midnight-scaffold-contract`
   - `pod-scaffold-dapp` → `midnight-scaffold-dapp`
   - `midnight-rag-query` → `midnight-rag-query`

3. **Natural language references** (documentation, comments):
   - `pod network` → `midnight network`
   - `Pod network` → `midnight network` (lowercase even at sentence start)
   - `pod` → `midnight` (when referring to the network)

---

## Exclusions (Do NOT Rename)

These patterns should NOT be changed:

- `podcast` (unrelated word)
- `iPod` (unrelated product)
- File paths in git history
- External URLs or references to actual pod network
- Third-party package names in node_modules

---

## Verification Commands

After renaming, verify with:

```bash
# Should return ZERO results for pod references in working files
grep -r "midnight-plugin" --exclude-dir=node_modules --exclude-dir=.git
grep -r "midnight-network" --exclude-dir=node_modules --exclude-dir=.git
grep -r "midnight-rag" --exclude-dir=node_modules --exclude-dir=.git
grep -r "@midnight-plugin" --exclude-dir=node_modules --exclude-dir=.git

# Should return results for midnight references
grep -r "midnight-plugin" --exclude-dir=node_modules --exclude-dir=.git | wc -l
grep -r "midnight-network" --exclude-dir=node_modules --exclude-dir=.git | wc -l
```

---

## Success Criteria

From spec.md SC-001:
- ✅ Zero occurrences of "midnight-plugin", "midnight-network", "pod.network" in working files (excluding node_modules, .git, archives)

---

## Special Considerations

### midnight network Branding Philosophy

- **Always lowercase**: Even at start of sentences, in titles, everywhere
- **Rationale**: Builder-focused, unpretentious, privacy-first
- **Grammar**: Restructure sentences to avoid awkward lowercase starts
  - ❌ "midnight network is a blockchain"
  - ✅ "The midnight network is a blockchain"
  - ✅ "Developers use midnight network"

### Technical Identifiers

- Use kebab-case: `midnight-plugin`, `midnight-network`
- NOT camelCase: ~~`midnightPlugin`~~
- NOT PascalCase: ~~`MidnightNetwork`~~

---

## Implementation Order

1. **Phase 2 (Foundational)**: Update branding rules (CLAUDE.md, constitution.md, this document)
2. **Phase 3 (US1 - Branding)**:
   - Rename directories
   - Update package.json files
   - Global find/replace in source code
   - Rebuild and verify
3. **Phase 4 (US2 - Content)**: Update documentation content, RAG database, templates
4. **Phase 7 (Polish)**: Update README, DEVELOPMENT.md, CONTRIBUTING.md

---

## Notes

- This document is a living reference during migration
- Update if new naming patterns are discovered
- Commit this document early so team has consistent reference

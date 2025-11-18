# Query Formulation Best Practices

A comprehensive guide to transforming user questions into high-quality search queries that maximize retrieval relevance.

## Core Principles

### Principle 1: Preserve Intent, Expand Coverage

Maintain the user's core intent while expanding semantic coverage to capture variations in how documentation might express concepts.

**Example:**

```
User question: "How do I query pod network state?"

Core intent: Query blockchain state on pod network
Coverage expansion:
- "pod network state query"
- "pod RPC state methods"
- "read pod blockchain state"
- "pod API state access"
- "query pod contract state"
```

Each variation preserves intent (querying state) while using different terminology found in documentation.

### Principle 2: Use Technical Precision

Blockchain documentation uses precise technical terminology. Generic terms miss the target.

**Good vs Bad Examples:**

```
❌ Generic: "make my code work"
✅ Technical: "pod contract development best practices"

❌ Generic: "get data from chain"
✅ Technical: "pod network RPC state query methods"

❌ Generic: "call pod"
✅ Technical: "pod RPC API method invocation"

❌ Generic: "deploy to pod"
✅ Technical: "pod contract deployment process"
```

### Principle 3: Include Multiple Terminology Layers

Blockchain development spans multiple abstraction levels. Include terms from all relevant layers.

**Example:**

```
User asks: "How do I create an NFT?"

Layer 1 - User terminology: "NFT create"
Layer 2 - Standard terminology: "ERC-721 token implementation"
Layer 3 - Technical terminology: "non-fungible token contract"
Layer 4 - Implementation terminology: "OpenZeppelin ERC721 mint"
Layer 5 - Pattern terminology: "NFT minting function safeMint"

Good query combines layers:
"ERC-721 NFT implementation minting OpenZeppelin"
```

## Synonym Expansion

### Using the get-synonyms.sh Script

Leverage the synonym lookup script to discover alternative terminology when formulating queries.

**Basic usage:**

```bash
# Look up synonyms for uncertain terms
./scripts/get-synonyms.sh "reentrancy"
# Returns: re-entrancy,reentrant,recursive call,reentrancy attack,cross-function reentrancy

# Use synonyms to enrich query
# Original: "reentrancy prevention"
# Enhanced: "reentrancy reentrant attack prevention guard"
```

**When to use synonyms:**

- Initial query returns low relevance results (<0.5)
- User uses colloquial or informal terminology
- Implementing multi-angle search strategy
- Uncertain about correct technical terminology
- Want to maximize search coverage

**Integration workflow:**

```bash
# Step 1: Identify key term from user question
TERM="smart contract"

# Step 2: Get synonyms
SYNONYMS=$(./scripts/get-synonyms.sh "$TERM")
# Returns: "contract,dapp contract,on-chain code,blockchain program,solidity contract"

# Step 3: Incorporate into query formulation
# Original query: "smart contract security"
# Enhanced query: "smart contract security dapp blockchain program solidity"
```

### Query Reformulation with Synonyms

**Complete example:**

```
User: "How do I make a function only the owner can call?"

Step 1: Identify key concepts
- Concept: Access restriction
- Actor: Owner
- Target: Function

Step 2: Generate synonym variations using script
./scripts/get-synonyms.sh "access control"
# Returns: authorization,permissions,role-based access,RBAC,ownership

./scripts/get-synonyms.sh "owner"
# Could expand to: ownable,ownership,admin,authorized

Step 3: Formulate multiple query variations
Query 1: "restrict function access owner only"
Query 2: "onlyOwner modifier Solidity"
Query 3: "access control ownership pattern"
Query 4: "require msg.sender owner authorization"
Query 5: "Ownable contract OpenZeppelin"

Step 4: Select best queries based on strategy
Standard mode: Query 2 + Query 5 (most specific)
Advanced mode: All 5 queries (comprehensive coverage)
```

## Technical Term Expansion Strategies

### Strategy 1: Function Name Variations

Expand to include all related function names and variations.

**Example:**

```
User mentions: "transfer"

Expand to related functions:
- "transfer function"
- "transferFrom"
- "safeTransfer"
- "safeTransferFrom"
- "_transfer internal"
- "transfer ERC20 ERC721"

Formulated query: "transfer transferFrom safeTransfer ERC20 implementation"
```

### Strategy 2: Standard Variations

Include all naming conventions for standards.

**Example:**

```
User mentions: "ERC20"

Include naming conventions:
- "ERC20" (no hyphen)
- "ERC-20" (hyphen)
- "ERC 20" (space)
- "IERC20" (interface)
- "ERC20 token"
- "fungible token standard"

Formulated query: "ERC20 ERC-20 token standard implementation"
```

### Strategy 3: Version-Specific Terms

Adjust terminology based on Solidity version context.

**Example:**

```
User asks: "How do I handle overflow?"

Context detection: Check Solidity version if available

If Solidity >= 0.8.0:
- "Solidity 0.8 built-in overflow"
- "unchecked block arithmetic"
- "checked arithmetic 0.8"

If Solidity < 0.8.0:
- "SafeMath library"
- "OpenZeppelin SafeMath"
- "overflow protection library"

Query for modern: "Solidity 0.8 overflow protection unchecked"
Query for legacy: "SafeMath library overflow prevention"
```

### Strategy 4: Framework-Aware Expansion

Detect and incorporate framework-specific terminology.

**Example:**

```
User asks: "How do I deploy my contract?"

Detect framework context from project:

If Hardhat detected:
- "Hardhat deployment script"
- "hardhat deploy plugin"
- "Hardhat Ignition deployment"
- "npx hardhat run deploy"

If Foundry detected:
- "Foundry forge create"
- "forge script deployment"
- "Foundry deployment best practices"

If Truffle detected:
- "Truffle migration"
- "truffle migrate deployment"

Query (Hardhat): "Hardhat deployment script ignition deploy contract"
```

### Strategy 5: Error Message Expansion

Expand error messages to cover solutions and workarounds.

**Example:**

```
User reports: "I'm getting 'stack too deep' error"

Expand to cover:
- "stack too deep error"
- "stack too deep workaround"
- "stack too deep Solidity"
- "too many local variables"
- "stack too deep solution"
- "internal compiler error stack"

Formulated query: "stack too deep error workaround Solidity local variables"
```

## Advanced Reformulation Patterns

### Pattern 1: Conceptual → Implementation

Transform high-level concepts into implementation terms.

**Example:**

```
User: "How do I make my contract pausable?"

Conceptual understanding:
- Emergency stop functionality
- Pause/unpause operations
- Security-sensitive contracts

Implementation terms:
- Pausable contract pattern
- OpenZeppelin Pausable
- whenNotPaused modifier
- _pause and _unpause functions
- Emergency circuit breaker

Query 1 (conceptual): "pausable contract emergency stop pattern"
Query 2 (implementation): "OpenZeppelin Pausable whenNotPaused modifier"
Query 3 (pattern): "circuit breaker pattern Solidity implementation"
```

### Pattern 2: Problem → Solution

Transform problem descriptions into solution-oriented queries.

**Example:**

```
User: "My contract is running out of gas"

Problem analysis:
- Gas limit exceeded
- Needs optimization
- Loop, storage, or complexity issue

Solution-oriented queries:
Query 1: "gas optimization techniques Solidity"
Query 2: "reduce gas consumption contract"
Query 3: "storage optimization gas efficiency"
Query 4: "loop optimization gas limit"
Query 5: "gas profiling identify expensive operations"
```

### Pattern 3: Vague → Specific

Transform vague questions into specific technical queries.

**Example:**

```
User: "How do I make my contract better?"

Analysis: Too vague - needs multiple angles

Specific interpretations:
1. Security: "smart contract security best practices"
2. Gas: "gas optimization techniques Solidity"
3. Code quality: "Solidity coding standards style guide"
4. Maintainability: "contract upgradeability patterns"
5. Testing: "smart contract testing best practices"

Recommendation: Use Comprehensive Multi-Query with all 5 interpretations
```

### Pattern 4: Implicit Context Injection

Add implicit context based on conversation or project state.

**Example:**

```
User: "How do I add a whitelist?"

Current file context: "MyToken.sol" (ERC20 contract)
Recent queries: About access control

Inject context into query:
Query 1: "whitelist access control ERC20 token"
Query 2: "whitelist mapping address restriction"
Query 3: "OpenZeppelin AccessControl whitelist role"

Without context:
Query: "whitelist implementation Solidity"

With context (better):
Query: "whitelist access control ERC20 token contract"
```

### Pattern 5: Comparative Expansion

When user asks about choices, expand to cover comparison.

**Example:**

```
User: "Should I use transfer or call?"

Expand to cover both + comparison:
Query 1: "transfer vs call vs send ether"
Query 2: "transfer function limitations 2300 gas"
Query 3: "call value send comparison security"
Query 4: "OpenZeppelin Address sendValue"
Query 5: "ether transfer best practices 2024"

Captures:
- Individual explanations of each method
- Direct comparisons
- Security considerations
- Current best practices
```

## Code-Specific Query Patterns

### When User Shares Code

Analyze code to identify specific issues, then target those issues in queries.

**Example:**

````
User: "What's wrong with this code?"
```solidity
function withdraw() public {
    payable(msg.sender).transfer(balance[msg.sender]);
    balance[msg.sender] = 0;
}
````

Analysis:

- Reentrancy vulnerability (transfer before state update)
- Missing checks
- No events

Target specific issues:
Query 1: "reentrancy vulnerability transfer before update"
Query 2: "checks-effects-interactions pattern"
Query 3: "ReentrancyGuard OpenZeppelin implementation"
Query 4: "secure withdrawal function pattern"

NOT generic queries:
❌ "code review Solidity"
❌ "smart contract bugs"

```

### When User Asks About Specific Syntax

Use precise, syntax-focused queries.

**Example:**
```

User: "How do I declare a mapping of addresses to structs?"

Specific query:
✅ "Solidity mapping address struct declaration syntax"

Include related patterns:
✅ "mapping address struct nested storage pattern"

NOT expanded to unrelated topics:
❌ "Solidity data structures" (too broad)
❌ "struct declaration" (missing mapping context)

```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Over-Generic Queries

**Problem:** Returns everything, no focus.

```

❌ Bad: "security"
✅ Good: "reentrancy attack prevention techniques"

❌ Bad: "contract"
✅ Good: "ERC-721 NFT contract implementation"

```

### Anti-Pattern 2: Including Question Words

**Problem:** Question words don't appear in documentation.

```

❌ Bad: "how do I prevent reentrancy attacks?"
✅ Good: "prevent reentrancy attacks techniques"

❌ Bad: "what is a proxy pattern?"
✅ Good: "proxy pattern upgradeable contracts explanation"

```

### Anti-Pattern 3: User's Exact Phrasing

**Problem:** Colloquial language doesn't match technical docs.

```

User: "I want to make a thingy that lets people vote"

❌ Bad: "thingy that lets people vote"
✅ Good: "voting mechanism governance contract implementation"

```

### Anti-Pattern 4: Including Metadata in Query

**Problem:** Metadata words waste query space.

```

❌ Bad: "Solidity documentation about mappings"
✅ Good: "Solidity mapping declaration syntax examples"

```

### Anti-Pattern 5: Over-Expansion

**Problem:** Wasting time researching irrelevant aspects.

```

User: "How do I use OpenZeppelin's Ownable?"

❌ Bad: Generate 10 queries covering every aspect of ownership
✅ Good: 1-2 targeted queries about Ownable usage

```

### Anti-Pattern 6: Losing Specificity

**Problem:** Important context gets dropped.

```

User: "How do I fix 'stack too deep' in my constructor?"

❌ Bad: "stack too deep error"
✅ Good: "stack too deep error constructor workaround"

````

## Contextual Query Enhancement

### Using Project Context

Extract and inject project-specific context into queries.

**Example:**
```javascript
// Project context
const projectContext = {
  currentFile: "GovernanceToken.sol",
  imports: [
    "@openzeppelin/contracts/governance/Governor.sol",
    "@openzeppelin/contracts/token/ERC20/ERC20.sol"
  ],
  dependencies: {
    "@openzeppelin/contracts": "^5.0.0",
    "hardhat": "^2.19.0"
  },
  solidityVersion: "0.8.20"
};

// User asks: "How do I implement voting?"

// Without context:
query = "voting implementation Solidity";

// With context:
query = "OpenZeppelin Governor voting implementation ERC20 token";
// Injected: OpenZeppelin (from imports), Governor (from imports),
//           ERC20 (from imports)
````

### Using Conversation History

Carry forward relevant context from previous messages.

**Example:**

```
// Previous messages:
// User: "I'm building an ERC-721 contract"
// Claude: [provides ERC-721 info]
// User: "How do I add a whitelist?"

// Without history:
query = "whitelist implementation";

// With history:
query = "ERC-721 NFT whitelist presale implementation";
// Injected: ERC-721, NFT from conversation context
```

## Query Optimization by Search Type

### For Conceptual Questions (Broad Learning)

Use broader terms with multiple perspectives.

**Example:**

```
User: "What is a proxy pattern?"

Strategy: Multiple angles for concept understanding

Queries:
1. "proxy pattern upgradeable contracts explanation"
2. "transparent proxy vs UUPS proxy"
3. "delegatecall proxy implementation pattern"
4. "proxy contract security considerations"

Why: Conceptual questions benefit from multiple angles
```

### For Implementation Questions (Specific Code)

Use specific implementation terms and code-focused queries.

**Example:**

```
User: "How do I implement ERC-721 metadata?"

Strategy: Concrete implementation focus

Queries:
1. "ERC-721 metadata tokenURI implementation"
2. "OpenZeppelin ERC721URIStorage example"
3. "NFT metadata IPFS integration"

Why: User wants concrete code, not theory
```

### For Troubleshooting Questions (Debugging)

Focus on error-specific terms and common causes.

**Example:**

```
User: "Why is my contract reverting?"

Strategy: Diagnostic information focus

Queries:
1. "contract revert reasons common causes"
2. "require revert custom error messages"
3. "transaction revert debugging techniques"
4. "revert reason string extraction"

Why: Troubleshooting needs diagnostic information
```

### For Security Questions (High Stakes)

Use comprehensive coverage with multiple security dimensions.

**Example:**

```
User: "Is my contract secure?"

Strategy: Comprehensive security (Multi-Query recommended)

Queries:
1. "smart contract security audit checklist"
2. "common Solidity vulnerabilities attacks"
3. "reentrancy overflow access control prevention"
4. "OpenZeppelin security best practices"
5. "formal verification security testing"

Why: Security is critical, needs comprehensive coverage
```

## Query Templates by Question Type

### "How do I...?" Questions

**Template:** [action] + [subject] + [framework/context]

**Examples:**

```
"How do I deploy a contract?"
→ "deploy contract Hardhat script"

"How do I create an NFT?"
→ "create ERC-721 NFT OpenZeppelin implementation"

"How do I test my contract?"
→ "test smart contract Hardhat Waffle examples"
```

### "What is...?" Questions

**Template:** [concept] + [explanation/definition] + [context]

**Examples:**

```
"What is a reentrancy attack?"
→ "reentrancy attack explanation prevention"

"What is the difference between X and Y?"
→ "X vs Y comparison differences"

"What is delegatecall?"
→ "delegatecall explanation proxy pattern"
```

### "Why is...?" Questions

**Template:** [symptom] + [cause] + [solution]

**Examples:**

```
"Why is my transaction failing?"
→ "transaction failure revert reason debugging"

"Why is gas so high?"
→ "high gas cost optimization techniques"
```

### Error Message Questions

**Template:** [exact error] + [workaround/solution] + [context]

**Examples:**

```
"Getting 'stack too deep' error"
→ "stack too deep error workaround solution Solidity"

"Transaction reverted without reason"
→ "transaction revert no reason debugging techniques"
```

## Multi-Query Generation Strategy

When using Comprehensive Multi-Query Research, generate queries covering different **dimensions** of the problem.

**Example:**

```
User: "How do I build a token sale contract?"

Dimension 1 - Basic implementation:
"token sale contract implementation ICO"

Dimension 2 - Security:
"token sale security vulnerabilities prevention"

Dimension 3 - Standards:
"ERC-20 token sale distribution mechanism"

Dimension 4 - Best practices:
"token sale best practices fairness"

Dimension 5 - Examples:
"OpenZeppelin Crowdsale contract example"

Each query targets different aspects of the problem
```

## Query Quality Checklist

Before finalizing a query, verify:

- [ ] Technical terminology used (not colloquial language)
- [ ] Specific enough (avoid generic terms like "code", "contract")
- [ ] Framework/library mentioned if relevant (OpenZeppelin, Hardhat)
- [ ] Version-aware if version matters (Solidity 0.8.x)
- [ ] Context injected from project/conversation if available
- [ ] Synonyms considered for key terms (use get-synonyms.sh)
- [ ] Action-oriented for how-to questions
- [ ] Problem-focused for troubleshooting
- [ ] No question words (how, what, why removed)
- [ ] No filler words (the, a, an minimized)

## Complete Example: From User Question to Queries

**Scenario:**

```
User: "I'm getting weird behavior when people try to buy my NFTs.
       Sometimes it works, sometimes they lose gas but don't get the NFT.
       What's going on?"
```

**Step 1: Analyze the question**

- Problem: Inconsistent NFT purchase behavior
- Symptom: Transaction failure with gas loss
- Likely causes: State issues, reentrancy, or race conditions
- Context: NFT purchase function (likely ERC-721)

**Step 2: Identify key concepts**

- NFT purchase/minting
- Transaction failures
- State management issues
- Potential reentrancy

**Step 3: Check synonyms**

```bash
./scripts/get-synonyms.sh "NFT"
# Returns: non-fungible token,ERC-721,unique asset,collectible,digital asset

./scripts/get-synonyms.sh "reentrancy"
# Returns: re-entrancy,reentrant,recursive call,reentrancy attack,cross-function reentrancy
```

**Step 4: Choose strategy**

- Complex troubleshooting question
- Multiple potential causes
- Security implications
  → Use Comprehensive Multi-Query Research

**Step 5: Generate strategic queries**

Query 1 (Direct problem):
"NFT minting transaction failure race condition"

Query 2 (Security angle):
"reentrancy attack NFT purchase function"

Query 3 (State management):
"NFT mint state management checks-effects-interactions"

Query 4 (Common patterns):
"ERC-721 safe minting best practices"

Query 5 (Troubleshooting):
"transaction revert gas loss debugging"

**Step 6: Execute searches**

- Run all 5 queries in parallel
- Each returns 8-10 results (~40 total chunks)

**Step 7: Review and curate results**

- Identify key issues: checks-effects-interactions violation
- Find relevant code examples of correct implementation
- Locate security documentation about minting vulnerabilities
- Select 6-7 most relevant chunks

**Step 8: Synthesize answer**
"Based on your symptoms, this sounds like a checks-effects-interactions
issue in your minting function [cite security doc]. When multiple users
try to mint simultaneously, you might be checking availability after
updating state [cite common vulnerability]. Here's the correct pattern
[cite code example]..."

## Summary: Query Formulation Recipe

**10-step systematic approach:**

1. **Extract core intent** from user question
2. **Identify key technical terms** (real terminology, not user's words)
3. **Expand with synonyms** using get-synonyms.sh script
4. **Add framework context** (OpenZeppelin, Hardhat, etc.)
5. **Include version context** if relevant (Solidity 0.8.x)
6. **Inject project context** if available
7. **Choose query count** based on complexity
8. **Remove filler words** (how, what, the, a)
9. **Make action-oriented** for how-to questions
10. **Verify technical precision** before executing

This systematic approach transforms vague user questions into high-precision queries that retrieve exactly the right documentation.

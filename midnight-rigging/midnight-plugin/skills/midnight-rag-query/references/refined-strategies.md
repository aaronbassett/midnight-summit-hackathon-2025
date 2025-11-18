# Refined Query Strategies

This document provides detailed guidance for advanced search strategies when querying the pod network knowledge base. Use these strategies when initial searches are insufficient or when questions are complex and multi-dimensional.

## Strategy 1: Multi-Angle Search

Use when a single query might not capture the user's need. Execute multiple searches from different angles to build comprehensive understanding.

### Parameters

- Multiple `semantic_search` calls with different queries
- `min_relevance`: 0.5-0.6 (moderate threshold per query)
- `limit`: 5-7 per query

### Best For

- Ambiguous questions with multiple interpretations
- Cross-cutting concerns spanning multiple domains
- Topics with multiple terminology or frameworks
- When initial results are insufficient
- Complex problems requiring multi-faceted solutions
- Synthesizing information from different perspectives

### Query Formulation Guidelines

- Identify 2-4 distinct angles on the problem
- Each query should focus on different aspect
- Use varied terminology across queries
- Cover complementary perspectives

### Examples

#### Example 1: Multi-Faceted Optimization

**User query**: "How do I make my contract more gas efficient?"

**Analysis**: This question spans multiple optimization domains (storage, functions, data structures).

**Multi-angle approach**:

**Query 1**: "Solidity gas optimization techniques"

- `limit`: 5
- `min_relevance`: 0.5
- Focus: General optimization principles

**Query 2**: "smart contract storage optimization"

- `limit`: 5
- `min_relevance`: 0.5
- Focus: Storage-specific techniques

**Query 3**: "efficient data structures Solidity"

- `limit`: 5
- `min_relevance`: 0.5
- Focus: Data structure choices

**Execution**:

1. Execute all three searches
2. Collect 10-15 total results
3. Synthesize comprehensive answer covering:
   - Storage optimization (packing, slots)
   - Function optimization (view, pure, payable)
   - Data structure choices (arrays vs mappings)
4. Cite sources across all searches
5. Prioritize high-impact, practical advice

**Expected outcome**: Multi-dimensional view of gas optimization from complementary perspectives.

#### Example 2: Ambiguous Security Question

**User query**: "How do I secure my smart contract?"

**Analysis**: "Secure" is broad and could mean multiple aspects of security.

**Multi-angle approach**:

**Query 1**: "smart contract access control security patterns"

- Focus: Access control and permissions

**Query 2**: "smart contract reentrancy attack prevention"

- Focus: Common attack vectors

**Query 3**: "smart contract input validation best practices"

- Focus: Input sanitization and validation

**Query 4**: "smart contract security audit checklist"

- Focus: Comprehensive security review

**Execution**:

1. Execute 4 searches targeting different security aspects
2. Collect 20-28 results total
3. Organize by security category:
   - Access control
   - Attack prevention
   - Input validation
   - Testing and auditing
4. Prioritize by severity and likelihood
5. Create security checklist from results

**Expected outcome**: Comprehensive security guidance covering multiple vulnerability classes.

#### Example 3: Framework Comparison

**User query**: "What's the best way to handle contract upgrades?"

**Analysis**: Multiple approaches exist (proxies, migration, versioning).

**Multi-angle approach**:

**Query 1**: "transparent proxy pattern upgradeable contracts"

- Focus: Transparent proxy approach

**Query 2**: "UUPS proxy pattern upgradeable contracts"

- Focus: UUPS proxy approach

**Query 3**: "contract migration vs proxy upgrades"

- Focus: Alternative approaches

**Execution**:

1. Execute searches for different upgrade patterns
2. Compare approaches from results
3. Create comparison table:
   - Complexity
   - Gas costs
   - Security considerations
   - Use cases
4. Recommend based on user context

**Expected outcome**: Informed comparison enabling pattern selection.

## Strategy 2: Iterative Refinement

Use when initial results are too broad, off-target, or when terminology is uncertain. Start broad, analyze results, then narrow progressively.

### Parameters

- First search: `min_relevance`: 0.4, `limit`: 8 (exploratory)
- Subsequent searches: Adjust based on initial results
  - If too broad: Increase `min_relevance` to 0.6-0.7, refine query
  - If no results: Decrease `min_relevance` to 0.3, broaden query

### Best For

- Unfamiliar terminology or concepts
- When unsure of exact technical terms
- Topics at edge of knowledge base coverage
- Initial results show wrong interpretation
- Learning correct domain vocabulary
- Exploring new or emerging patterns

### Query Formulation Guidelines

- Start with general terms
- Analyze initial results for better terminology
- Refine query with discovered technical terms
- Adjust relevance threshold based on result quality

### Examples

#### Example 1: Unfamiliar Pattern

**User query**: "How do I implement the diamond pattern?"

**Analysis**: User may not know correct terminology or variations.

**Iterative approach**:

**Iteration 1 - Exploratory**:

- Query: "diamond pattern smart contract Solidity"
- `limit`: 8
- `min_relevance`: 0.4
- Results show: References to "EIP-2535 Diamond Standard"

**Iteration 2 - Refined**:

- Query: "EIP-2535 diamond standard implementation facets"
- `limit`: 7
- `min_relevance`: 0.6
- Results show: Detailed implementation guides

**Synthesis**:

1. Use terminology from iteration 1 ("EIP-2535", "facets")
2. Combine results showing both concept and implementation
3. Structure answer: concept → implementation → examples
4. Note: Initial broad search revealed correct terminology

**Expected outcome**: Progressive discovery from concept to implementation details.

#### Example 2: Emerging Topic

**User query**: "How do I implement account abstraction in my contracts?"

**Analysis**: Newer topic, may have sparse coverage.

**Iterative approach**:

**Iteration 1 - Broad Search**:

- Query: "account abstraction smart contracts"
- `limit`: 8
- `min_relevance`: 0.3 (very low threshold)
- Results: Some conceptual information, but limited

**Analysis of Iteration 1**:

- Found references to "ERC-4337" and "smart contract wallets"
- Relevance scores around 0.4-0.5

**Iteration 2 - Targeted Search**:

- Query: "ERC-4337 implementation smart contract wallets"
- `limit`: 8
- `min_relevance`: 0.45
- Results: More specific implementation details

**Synthesis**:

1. Combine conceptual and implementation results
2. If gaps remain, acknowledge knowledge base limitations
3. Supplement with Claude's base knowledge
4. Suggest official ERC-4337 specification

**Expected outcome**: Best available information with honest assessment of coverage.

#### Example 3: Terminology Uncertainty

**User query**: "How do I make my contract automatically execute something later?"

**Analysis**: User doesn't know term "automation" or "keepers".

**Iterative approach**:

**Iteration 1 - Broad Terms**:

- Query: "smart contract automatic execution scheduled future"
- `limit`: 8
- `min_relevance`: 0.35
- Results reveal: "Chainlink Keepers", "automation", "time-based triggers"

**Iteration 2 - Refined Terms**:

- Query: "Chainlink Keepers automation smart contracts"
- `limit`: 6
- `min_relevance`: 0.6
- Results: Specific implementation guides

**Synthesis**:

1. Explain discovered terminology
2. Present specific solutions (Chainlink Keepers, etc.)
3. Note: Initial query used user's language, refined to domain terms

**Expected outcome**: User learns correct terminology while getting practical solution.

## Strategy 3: Comprehensive Multi-Query Research

Use when dealing with broad, open-ended questions that require deep exploration across multiple dimensions, combined with expert curation of results to synthesize the most comprehensive answer.

### Parameters

- Multiple `semantic_search` calls (3-5 strategic queries)
- `min_relevance`: 0.5 (moderate threshold)
- `limit`: 8-10 per query (larger result pool)
- Total results: 30-50 chunks for review
- Curated selection: 5-8 best chunks for synthesis

### Best For

- Open-ended improvement questions ("How do I improve X?")
- Security-critical decisions requiring thorough coverage
- Architecture and design decisions
- Comprehensive learning on complex topics
- Questions requiring synthesis across multiple domains
- High-stakes implementations needing deep research

### Differences from Multi-Angle Search

- **Multi-Angle Search**: Different perspectives on known problem (5-7 results per query, use all)
- **Comprehensive Multi-Query Research**: Cast wide net, then curate best results from large pool (8-10 per query, select 5-8 best)

### Query Formulation Guidelines

- Think strategically about knowledge dimensions needed
- Create 3-5 complementary queries covering different aspects
- Balance specificity with breadth
- Include queries for principles, patterns, pitfalls, and practices
- Ensure queries are distinct enough to return different results

### Implementation Workflow

**Phase 1: Strategic Planning**

1. Analyze the question to identify key dimensions
2. Determine what types of knowledge are needed:
   - Conceptual understanding
   - Practical implementation
   - Common pitfalls
   - Best practices
   - Real-world examples
3. Generate 3-5 strategic query variations

**Phase 2: Comprehensive Search**

1. Execute all queries in parallel if possible
2. Use higher `limit` (8-10) to build large result pool
3. Use moderate `min_relevance` (0.5) to capture broad coverage
4. Collect 30-50 total results

**Phase 3: Expert Curation**

1. Review all results systematically
2. Evaluate each chunk for:
   - Relevance score
   - Information quality
   - Uniqueness (not redundant)
   - Practical value
   - Authority of source
3. Select 5-8 best chunks that together provide comprehensive coverage
4. Reject redundant or low-value results

**Phase 4: Comprehensive Synthesis**

1. Organize selected chunks thematically
2. Build coherent narrative from curated selection
3. Include code examples from highest-quality sources
4. Cite all selected sources
5. Note any gaps in coverage

### Examples

#### Example 1: Broad Security Question

**User query**: "How do I make my smart contract more secure?"

**Analysis**: Very broad question with multiple security dimensions. Requires comprehensive coverage across vulnerabilities, patterns, and practices.

**Phase 1 - Strategic Planning**:

Identify dimensions needed:

- General security principles
- Common vulnerabilities
- Security patterns and implementations
- Audit processes
- Specific attack prevention

Generate strategic queries:

- Query 1: "smart contract security best practices Solidity"
- Query 2: "common smart contract vulnerabilities attacks exploits"
- Query 3: "OpenZeppelin security patterns SafeMath ReentrancyGuard"
- Query 4: "smart contract security audit checklist review"
- Query 5: "reentrancy overflow access control prevention techniques"

**Phase 2 - Comprehensive Search**:

Execute all 5 queries in parallel:

```javascript
// Query 1
semantic_search({
  query: 'smart contract security best practices Solidity',
  limit: 10,
  min_relevance: 0.5
});

// Query 2
semantic_search({
  query: 'common smart contract vulnerabilities attacks exploits',
  limit: 10,
  min_relevance: 0.5
});

// ... (Queries 3-5)
```

Results: 38 unique chunks returned (some overlap across queries)

**Phase 3 - Expert Curation**:

Review all 38 results:

- `security_overview_089` (0.91): Comprehensive security principles ✓ **Select**
- `code_reentrancy_143` (0.89): ReentrancyGuard implementation example ✓ **Select**
- `vulnerabilities_031` (0.87): Common vulnerabilities with explanations ✓ **Select**
- `patterns_access_018` (0.85): Access control patterns (Ownable, RBAC) ✓ **Select**
- `audit_checklist_234` (0.83): Security audit checklist ✓ **Select**
- `exploits_real_091` (0.82): Real-world exploit case studies ✓ **Select**
- `safemath_usage_156` (0.80): SafeMath usage examples ✓ **Select**
- `code_reentrancy_298` (0.78): Redundant with code_143 ✗ **Reject**
- `generic_security_445` (0.54): Generic programming, not Solidity-specific ✗ **Reject**
- `overflow_history_223` (0.73): Historical context, less practical ✗ **Reject**
- ... (continue reviewing all 38)

Selected: 7 chunks providing comprehensive, non-redundant coverage

**Phase 4 - Comprehensive Synthesis**:

Synthesize answer from 7 selected chunks:

1. **Security Principles Overview** (from security_overview_089)
   - Principle of least privilege
   - Defense in depth
   - Fail securely

2. **Common Vulnerabilities** (from vulnerabilities_031)
   - Reentrancy attacks (with example from code_reentrancy_143)
   - Integer overflow/underflow (with SafeMath from safemath_usage_156)
   - Access control issues
   - Front-running

3. **Prevention Techniques** (from multiple sources)
   - Use ReentrancyGuard (code example from code_reentrancy_143)
   - Implement proper access control (patterns from patterns_access_018)
   - Use SafeMath or Solidity 0.8+ (examples from safemath_usage_156)

4. **Real-World Context** (from exploits_real_091)
   - The DAO hack (reentrancy)
   - Parity wallet bug

5. **Audit Checklist** (from audit_checklist_234)
   - Pre-deployment security review steps

All with proper citations to the 7 selected sources.

**Expected outcome**: Comprehensive security guide synthesized from curated high-quality sources.

#### Example 2: Architecture Decision

**User query**: "What's the best approach for building an upgradeable DeFi protocol?"

**Analysis**: Complex question spanning upgradeability, DeFi patterns, and architecture. Requires research across multiple domains.

**Strategic queries**:

1. "upgradeable contracts proxy patterns transparent UUPS"
2. "DeFi protocol architecture design patterns"
3. "proxy upgrade security risks storage collisions"
4. "DeFi protocol governance upgrade mechanisms"
5. "OpenZeppelin upgrades plugin implementation"

**Execution**:

- 5 parallel searches, limit=9 each, min_relevance=0.5
- Total: 41 chunks returned

**Curation**:
Review all 41, select 6 best chunks covering:

- Proxy pattern comparison (transparent vs UUPS)
- DeFi-specific architecture considerations
- Security pitfalls in upgradeable contracts
- Governance integration patterns
- Step-by-step implementation guide
- Testing upgradeable contracts

**Synthesis**:
Create comprehensive guide addressing:

1. Proxy pattern selection with DeFi context
2. Architecture design for upgradeability
3. Security considerations (storage, selfdestruct, delegatecall)
4. Governance integration
5. Implementation using OpenZeppelin
6. Testing strategies

Cite all 6 sources with specific attribution for each section.

**Expected outcome**: Actionable architecture guidance synthesized from expert-curated sources.

#### Example 3: Learning Request

**User query**: "I want to learn everything about Solidity events and how to use them effectively."

**Analysis**: Comprehensive learning request. Need basics through advanced patterns.

**Strategic queries**:

1. "Solidity events declaration emit syntax basics"
2. "Solidity events indexed parameters topics"
3. "events vs storage tradeoffs gas optimization"
4. "best practices event design naming conventions"
5. "events frontend integration web3 ethers listening"

**Execution**:

- 5 queries, limit=8 each, min_relevance=0.5
- Total: 35 chunks returned

**Curation**:
Select 8 chunks providing learning progression:

- Basic event syntax and declaration
- Emit statement usage
- Indexed parameters and filtering
- Gas costs and optimization
- Event design best practices
- Common patterns (Transfer, Approval)
- Frontend integration examples
- Troubleshooting and debugging

**Synthesis**:
Build tutorial-style answer:

1. **Basics**: Syntax, declaration, emit (with examples)
2. **Indexed Parameters**: How they work, when to use (with examples)
3. **Gas Optimization**: Events vs storage cost comparison
4. **Design Patterns**: Naming, what to log, standard events
5. **Frontend Integration**: Listening to events with web3.js
6. **Best Practices**: Common pitfalls, debugging tips

Progressive learning path with all 8 sources cited appropriately.

**Expected outcome**: Complete learning resource from basics to advanced usage.

## Strategy 4: Exploratory Discovery

Use when exploring unfamiliar territory where the user needs to understand the landscape of a topic before diving deep. This strategy prioritizes breadth over depth and creates pathways for further exploration.

### Parameters

- Single `semantic_search` call (or 2-3 if topic is very broad)
- `min_relevance`: 0.3-0.4 (low threshold for discovery)
- `limit`: 8-12 (cast wide net)
- Focus: Overview, relationships, and discovery pathways

### Best For

- Exploring unfamiliar territory or new concepts
- Understanding ecosystem landscape (e.g., "What tools exist for X?")
- Discovering relationships between concepts
- Getting started with a broad topic area
- Building mental model before detailed learning
- Identifying what exists before choosing what to learn

### Differences from Broad Discovery

- **Broad Discovery** (in broad-strategies.md): General exploratory learning with synthesis
- **Exploratory Discovery**: Lower threshold, explicitly map landscape, suggest follow-up paths for iterative exploration

### Query Formulation Guidelines

- Use broad, inclusive terminology
- Include plural forms to capture variety ("standards", "patterns", "tools")
- Avoid narrowing qualifiers
- Frame for discovery, not depth
- Consider "what are all", "types of", "categories of" phrasing

### Implementation Workflow

**Phase 1: Cast Wide Net**

1. Formulate broad query capturing topic landscape
2. Set low relevance threshold (0.3-0.4) to maximize variety
3. Use higher limit (8-12) to see full spectrum
4. Execute search

**Phase 2: Map the Landscape**

1. Review results for major categories/types
2. Identify distinct concepts and relationships
3. Note frequency patterns (what appears most)
4. Organize by logical groupings

**Phase 3: Provide Overview**

1. Create high-level map of the domain
2. Brief description of each major component
3. Explain relationships and differences
4. Cite sources for each component

**Phase 4: Enable Further Discovery**

1. Suggest specific follow-up queries
2. Point to related concepts worth exploring
3. Indicate where deeper learning would be valuable
4. Create pathway for progressive discovery

### Examples

#### Example 1: Ecosystem Discovery

**User query**: "What are the different ERC token standards?"

**Analysis**: Exploratory question. User wants landscape overview, not implementation details. Need to discover variety of standards.

**Phase 1 - Cast Wide Net**:

Query: "ERC token standards types differences"

Execute:

```javascript
semantic_search({
  query: 'ERC token standards types differences',
  limit: 12,
  min_relevance: 0.35
});
```

Results: 11 chunks covering multiple standards (0.35-0.78 relevance)

**Phase 2 - Map the Landscape**:

Results show:

- ERC-20 (fungible tokens) - appears in 5 chunks
- ERC-721 (NFTs) - appears in 4 chunks
- ERC-1155 (multi-token) - appears in 3 chunks
- ERC-777 (advanced fungible) - appears in 2 chunks
- ERC-4626 (vaults) - appears in 1 chunk
- Mentions of ERC-2981, ERC-165

**Phase 3 - Provide Overview**:

Synthesize landscape:

**ERC Token Standards Overview:**

1. **ERC-20** (Most common)
   - Fungible tokens (all tokens identical)
   - Use case: Cryptocurrencies, utility tokens
   - Source: [citation]

2. **ERC-721**
   - Non-fungible tokens (unique items)
   - Use case: NFTs, collectibles, unique assets
   - Source: [citation]

3. **ERC-1155** (Multi-token)
   - Both fungible and non-fungible in one contract
   - Use case: Gaming (items + currencies), efficient batch transfers
   - Source: [citation]

4. **ERC-777** (Advanced Fungible)
   - Backward compatible with ERC-20
   - Additional features: hooks, operators
   - Use case: Advanced token mechanics
   - Source: [citation]

5. **ERC-4626** (Specialized)
   - Tokenized vaults standard
   - Use case: DeFi yield vaults
   - Source: [citation]

**Phase 4 - Enable Further Discovery**:

Suggest follow-ups:

- "Want to learn how to implement ERC-721 for NFTs?"
- "Interested in the differences between ERC-20 and ERC-777?"
- "Need help choosing which standard for your use case?"

Related concepts to explore:

- Token metadata standards (ERC-721 metadata, IPFS)
- Token extensions (ERC-721 Enumerable, ERC-20 Permit)
- Security considerations for each standard

**Expected outcome**: User understands the token standard landscape and has clear pathways for deeper exploration.

#### Example 2: Tool Discovery

**User query**: "What tools are available for testing Solidity smart contracts?"

**Analysis**: Exploring tooling ecosystem. User needs overview before choosing tools.

**Phase 1 - Cast Wide Net**:

Query: "Solidity smart contract testing tools frameworks"

Execute:

```javascript
semantic_search({
  query: 'Solidity smart contract testing tools frameworks',
  limit: 10,
  min_relevance: 0.4
});
```

Results: 9 chunks covering various testing tools

**Phase 2 - Map the Landscape**:

Categories emerge:

- Testing frameworks (Hardhat, Foundry, Truffle)
- Testing libraries (Waffle, Mocha/Chai)
- Security testing (Slither, Mythril, Echidna)
- Local networks (Ganache, Anvil)
- Coverage tools (solidity-coverage)

**Phase 3 - Provide Overview**:

**Smart Contract Testing Ecosystem:**

**Testing Frameworks:**

- **Hardhat**: JavaScript/TypeScript based, most popular
- **Foundry**: Rust-based, very fast, Solidity tests
- **Truffle**: Original framework, still widely used

**Testing Libraries:**

- **Waffle**: Chai matchers for Ethereum
- **Mocha/Chai**: Standard JavaScript testing

**Security Testing:**

- **Slither**: Static analysis tool
- **Mythril**: Symbolic execution
- **Echidna**: Fuzzing framework

**Local Development:**

- **Ganache**: Local Ethereum network
- **Anvil**: Foundry's local network, very fast

All with citations and brief descriptions.

**Phase 4 - Enable Further Discovery**:

Suggest follow-ups:

- "Want to see how to set up Hardhat for testing?"
- "Interested in learning about fuzzing with Echidna?"
- "Need help choosing between Hardhat and Foundry?"

**Expected outcome**: User understands testing tool landscape and can make informed choice about what to learn next.

#### Example 3: Concept Relationship Discovery

**User query**: "What are the different types of contract upgrades in Solidity?"

**Analysis**: Exploring upgrade patterns. Need to discover approaches and relationships.

**Phase 1 - Cast Wide Net**:

Query: "Solidity contract upgrade patterns proxy migration approaches"

Execute:

```javascript
semantic_search({
  query: 'Solidity contract upgrade patterns proxy migration approaches',
  limit: 10,
  min_relevance: 0.35
});
```

Results: 9 chunks about different upgrade approaches

**Phase 2 - Map the Landscape**:

Patterns identified:

- Proxy patterns (Transparent, UUPS, Beacon)
- Data migration approaches
- Contract replacement strategies
- Versioning patterns
- Relationship: Proxies vs migrations vs immutability

**Phase 3 - Provide Overview**:

**Contract Upgrade Approaches:**

**Proxy-Based (Most Common):**

1. **Transparent Proxy**
   - Admin and user calls handled differently
   - Most straightforward

2. **UUPS (Universal Upgradeable Proxy)**
   - Upgrade logic in implementation
   - More gas efficient

3. **Beacon Proxy**
   - Multiple proxies share implementation reference
   - Good for deploying many similar contracts

**Non-Proxy Approaches:**

1. **Data Migration**
   - Deploy new contract, migrate state
   - Clean slate but expensive

2. **Contract Replacement**
   - Update references to new contract
   - Simpler but breaks existing integrations

**Trade-offs:**

- Complexity vs flexibility
- Gas costs vs upgradeability
- Security implications

All with citations and relationship explanations.

**Phase 4 - Enable Further Discovery**:

Suggest follow-ups:

- "Want to learn how to implement a UUPS proxy?"
- "Interested in security considerations for proxy patterns?"
- "Need help deciding between proxy patterns for your use case?"

Related concepts:

- Storage layouts and slot collisions
- Initialization vs constructors in proxies
- OpenZeppelin Upgrades plugin

**Expected outcome**: User understands upgrade pattern landscape and relationships, with clear next steps.

## When to Use Refined Strategies

Choose refined strategies when:

1. **Initial search is insufficient**
   - Results off-target or too broad
   - Missing key aspects
   - Low relevance scores
   - Contradictory or incomplete information

2. **Question is complex or ambiguous**
   - Multiple valid interpretations
   - Cross-cutting concerns
   - Requires synthesizing multiple perspectives
   - No single "right" answer

3. **Terminology is uncertain**
   - User uses colloquial terms
   - Domain vocabulary unknown
   - New or emerging topics
   - Multiple naming conventions exist

4. **Need comprehensive coverage**
   - Critical decision requiring thorough research
   - Multiple approaches need comparison
   - Security-critical implementation
   - Full understanding required

## Strategy Selection Guide

### Use Multi-Angle Search when:

- Question clearly spans multiple domains
- Different perspectives needed
- Comparing multiple approaches
- Building comprehensive understanding
- User asks "how to" for complex feature
- Can use all returned results (limited curation needed)

### Use Iterative Refinement when:

- Initial results are poor (<0.5 relevance)
- Terminology is uncertain
- Topic is unfamiliar or emerging
- Results suggest better query terms
- Need to discover correct vocabulary

### Use Comprehensive Multi-Query Research when:

- Question is very broad and open-ended
- Need exhaustive coverage of topic
- High-stakes or security-critical decision
- Want best-of-breed results from large pool
- User explicitly requests comprehensive answer
- Topic requires deep expertise and curation

### Use Exploratory Discovery when:

- User is exploring unfamiliar territory
- Question asks "what are the types/categories/options"
- Need landscape overview before detailed learning
- Building mental model of domain
- Discovering what exists before choosing what to explore
- User wants starting point with pathways for deeper dives

### Combine Strategies when:

- Very complex problem requiring multiple approaches
- Multiple failed attempts with simpler strategies
- Critical decision requiring thoroughness
- Topic is both unfamiliar AND multi-faceted
- Example: Iterative Refinement to find terminology, then Multi-Query Research for depth

## Implementation Workflow

### Multi-Angle Search Workflow

1. **Analyze the question** - Identify 2-4 distinct angles
2. **Formulate queries** - One per angle, using different terminology
3. **Execute in parallel** - Call all searches at once if possible
4. **Aggregate results** - Collect all results together
5. **Synthesize** - Organize by theme, not by query
6. **Cite comprehensively** - Attribution across all searches

### Iterative Refinement Workflow

1. **Start broad** - Low threshold, general terms
2. **Analyze results** - Check relevance scores and content
3. **Identify refinements**:
   - Better terminology discovered?
   - Need narrower/broader scope?
   - Adjust threshold up/down?
4. **Execute refined search** - Apply learnings
5. **Synthesize** - Combine insights from all iterations
6. **Acknowledge journey** - Explain terminology discovery if relevant

### Comprehensive Multi-Query Research Workflow

1. **Strategic Analysis**
   - Identify all dimensions of the question
   - List types of knowledge needed
   - Plan 3-5 complementary query angles

2. **Parallel Execution**
   - Execute all queries simultaneously
   - Use limit=8-10 per query
   - Set min_relevance=0.5
   - Collect large result pool (30-50 chunks)

3. **Expert Curation**
   - Review all results systematically
   - Score each by relevance, quality, uniqueness
   - Select 5-8 best chunks
   - Explicitly reject redundant or low-value results
   - Document selection rationale

4. **Comprehensive Synthesis**
   - Organize selected chunks thematically
   - Build coherent narrative
   - Include best code examples
   - Cite all selected sources
   - Note any remaining gaps

### Exploratory Discovery Workflow

1. **Cast Wide Net**
   - Formulate broad, inclusive query
   - Set low threshold (0.3-0.4)
   - Use higher limit (8-12)
   - Execute search

2. **Map Landscape**
   - Identify major categories/types
   - Note frequency patterns
   - Organize by logical groupings
   - Find relationships between concepts

3. **Provide Overview**
   - Brief description of each component
   - Explain differences and relationships
   - Cite sources for each area
   - Keep high-level, not deep

4. **Enable Discovery**
   - Suggest specific follow-up queries
   - Point to related concepts
   - Create pathway for progressive exploration
   - Indicate where deeper learning is valuable

## Quality Indicators

### Successful Multi-Angle Search

- Results complement each other
- Different aspects of problem covered
- Synthesis provides holistic view
- No major gaps in coverage

### Successful Iterative Refinement

- Each iteration improves relevance
- Better terminology discovered
- Progressive understanding built
- Final results are actionable

### Successful Comprehensive Multi-Query Research

- Queries return diverse, complementary results
- Large pool (30-50 chunks) successfully collected
- Clear selection criteria applied during curation
- Selected chunks cover multiple dimensions
- Synthesis creates cohesive, comprehensive answer
- No major gaps in coverage

### Successful Exploratory Discovery

- Results capture variety across topic landscape
- Major categories/types clearly identified
- Relationships between concepts are evident
- Overview is comprehensive but not overwhelming
- Follow-up suggestions are specific and actionable
- User can make informed choice about what to explore next

### Warning Signs

- **Multi-angle**: All queries return similar results → queries not distinct enough
- **Iterative**: No improvement after refinement → may need multi-angle or different approach
- **Multi-Query Research**: Selected chunks still have gaps → need additional queries or angles
- **Exploratory Discovery**: All results about single narrow aspect → query too specific, broaden terminology
- **Exploratory Discovery**: Results too scattered, no clear patterns → topic may be too broad, break into sub-domains
- **All strategies**: Consistently low relevance (<0.4) → topic may be outside knowledge base

## Best Practices

### For Multi-Angle Search

- Make queries complementary, not overlapping
- Vary terminology significantly
- Execute searches efficiently (parallel if possible)
- Synthesize thematically, not query-by-query
- Note which angle provided which insights

### For Iterative Refinement

- Start broader than necessary
- Learn from each iteration
- Don't iterate more than 2-3 times
- Use discovered terminology explicitly
- Document the refinement journey if instructive

### For Comprehensive Multi-Query Research

- Plan queries strategically before execution
- Ensure queries are truly complementary
- Use parallel execution when possible for efficiency
- Be rigorous in curation phase—reject redundancy
- Document why chunks were selected/rejected
- Organize synthesis thematically, not by query
- Balance depth with readability
- Cite all selected sources clearly

### For Exploratory Discovery

- Use low relevance threshold to maximize variety
- Focus on breadth, not depth
- Organize results by logical categories
- Make follow-up suggestions specific and actionable
- Don't overwhelm—provide clear starting points
- Note frequency patterns (what appears most often)
- Explain relationships between discovered concepts
- Create clear pathways for progressive exploration

### Response Synthesis

- Show how pieces fit together
- Acknowledge if gaps remain
- Cite sources from all queries
- Prioritize highest-relevance insights
- Be transparent about strategy used

### Error Handling

- If multi-angle returns similar results → redundant queries, consolidate
- If iteration doesn't improve → acknowledge knowledge base limit
- If multi-query research yields insufficient unique chunks → broaden queries or reduce curation standards
- If curation phase finds too many low-quality results → adjust min_relevance or rethink query strategy
- If exploratory discovery returns too narrow results → broaden query terms, use more inclusive language
- If exploratory discovery is too scattered → break topic into sub-domains, do separate discoveries
- If all strategies fail → use Claude base knowledge, suggest external resources

# Broad Query Strategies

This document provides detailed guidance for exploratory and comprehensive search strategies when querying the pod network knowledge base. Use these strategies when the user is learning, exploring, or needs thorough coverage of a topic.

## Strategy 1: Broad Discovery

Use when the user is exploring a topic or learning broadly without specific implementation needs.

### Parameters

- `min_relevance`: 0.3-0.5 (lower threshold)
- `limit`: 5-8 (wider net)

### Best For

- General concept exploration
- Learning about unfamiliar topics
- Discovering related patterns
- Understanding ecosystem components
- Initial research on new areas
- Building mental models

### Query Formulation Guidelines

- Use broader, conceptual terms
- Include related concepts in query
- Avoid overly specific technical jargon
- Frame as exploration, not precision lookup

### Examples

#### Example 1: Security Concept Exploration

**User query**: "What are common smart contract security vulnerabilities?"

**Query formulation**: "smart contract security vulnerabilities common attacks"

**Execution**:

1. Call `semantic_search`:
   - `query`: "smart contract security vulnerabilities common attacks"
   - `limit`: 8
   - `min_relevance`: 0.4
2. Expect results covering multiple vulnerability types:
   - Reentrancy attacks
   - Access control issues
   - Integer overflow/underflow
   - Front-running
   - Timestamp dependence
   - And others
3. Organize results by category or severity
4. Provide overview of each vulnerability type
5. Cite sources for each category

**Expected outcome**: 5-8 results covering different vulnerability types, providing comprehensive security overview.

#### Example 2: Language Feature Learning

**User query**: "How do pod contract functions work?"

**Query formulation**: "pod contract functions parameters return types"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod contract functions parameters return types"
   - `limit`: 7
   - `min_relevance`: 0.4
2. Expect results explaining:
   - Function syntax
   - Parameter types
   - Return values
   - Function visibility
   - Common patterns
3. Structure answer from basic to advanced concepts
4. Include examples showing different function types

**Expected outcome**: Comprehensive understanding of pod contract functions with multiple examples.

#### Example 3: pod Network Features

**User query**: "What are pod network's unique features?"

**Query formulation**: "pod network features capabilities unique"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod network features capabilities unique"
   - `limit`: 8
   - `min_relevance`: 0.35
2. Expect results about:
   - Storage optimization
   - Function optimization
   - Data structure choices
   - Compiler optimizations
   - Design patterns
3. Group results by optimization category
4. Prioritize high-impact optimizations

**Expected outcome**: Broad overview of gas optimization covering multiple dimensions.

## Strategy 2: Comprehensive Research

Use when the user needs thorough information across multiple aspects for important decisions.

### Parameters

- `min_relevance`: 0.4-0.6 (balanced threshold)
- `limit`: 10-15 (comprehensive results)

### Best For

- Architecture decisions
- Complex feature implementation planning
- Security audits
- Comparing multiple approaches
- Critical decision-making
- Deep dives into complex topics

### Query Formulation Guidelines

- Include multiple related concepts
- Use comprehensive terms (e.g., "all", "complete", "comprehensive")
- Frame as research or comparison
- Include decision criteria if relevant

### Examples

#### Example 1: API Method Discovery

**User query**: "What RPC methods are available on pod network?"

**Query formulation**: "pod network RPC API methods available"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod network RPC API methods available"
   - `limit`: 12
   - `min_relevance`: 0.5
2. Expect results covering:
   - State query methods
   - Transaction methods
   - Block query methods
   - Contract interaction methods
   - Other relevant standards
3. Create comparison table or structured overview
4. Highlight use cases for each standard
5. Note which standards to use when

**Expected outcome**: Comprehensive comparison enabling informed standard selection.

#### Example 2: Upgradeable Contracts

**User query**: "How to implement upgradeable contracts safely?"

**Query formulation**: "upgradeable contracts proxy pattern implementation security best practices"

**Execution**:

1. Call `semantic_search`:
   - `query`: "upgradeable contracts proxy pattern implementation security best practices"
   - `limit`: 15
   - `min_relevance`: 0.45
2. Expect results about:
   - Proxy patterns (transparent, UUPS)
   - Storage layout considerations
   - Initialization patterns
   - Security pitfalls
   - pod contract upgrade patterns
   - Testing strategies
3. Organize by implementation phase:
   - Design considerations
   - Implementation details
   - Security checks
   - Testing and deployment
4. Highlight critical security concerns

**Expected outcome**: Complete guide to safe upgradeable contract implementation.

#### Example 3: DeFi Best Practices

**User query**: "What are best practices for DeFi protocol development?"

**Query formulation**: "DeFi protocol development best practices security architecture"

**Execution**:

1. Call `semantic_search`:
   - `query`: "DeFi protocol development best practices security architecture"
   - `limit`: 15
   - `min_relevance`: 0.4
2. Expect results covering:
   - Security patterns and audits
   - Oracle integration
   - Flash loan protection
   - Access control
   - Testing strategies
   - Economic attack vectors
   - Governance considerations
3. Structure as comprehensive checklist
4. Group by category (security, architecture, operations)
5. Prioritize by criticality

**Expected outcome**: Thorough DeFi development guide covering multiple dimensions.

## When to Use Broad Strategies

Choose broad strategies when:

1. **User is learning or exploring**
   - New to topic
   - Building understanding
   - Discovering what's possible
   - No specific implementation yet

2. **Decision-making needed**
   - Comparing approaches
   - Architecture planning
   - Technology selection
   - Risk assessment

3. **Comprehensive coverage required**
   - Security audits
   - Documentation writing
   - Teaching/training
   - Due diligence

4. **Topic is complex or multi-faceted**
   - Multiple valid approaches
   - Cross-cutting concerns
   - Interconnected concepts
   - Ecosystem understanding needed

## Result Handling

### With Broad Discovery

- Organize results by theme or category
- Provide overview before details
- Create learning path (basic → advanced)
- Highlight relationships between concepts
- Use lower relevance threshold (0.3-0.5)

### With Comprehensive Research

- Structure as checklist or decision matrix
- Compare and contrast approaches
- Note trade-offs and considerations
- Prioritize by importance or risk
- Use moderate relevance threshold (0.4-0.6)

## Quality Indicators

### Good Broad Results

- Cover multiple aspects of topic
- Show relationships between concepts
- Provide learning progression
- Include both basics and advanced topics

### Good Comprehensive Results

- Address decision criteria
- Show trade-offs clearly
- Cover edge cases and gotchas
- Include security considerations
- Cite authoritative sources

### Warning Signs

- All results about same narrow subtopic
- Missing key aspects of domain
- Overly theoretical without practical guidance
- Contradictory information without explanation

**Action if warning signs**: Consider using Refined Strategies (multi-angle or iterative) to fill gaps.

## Best Practices

### Query Formulation

- Start broader than you think necessary
- Include related concepts in query
- Use exploratory language
- Don't over-constrain with specific terms

### Result Organization

- Group by theme, priority, or learning path
- Use headings to structure information
- Create tables for comparisons
- Highlight actionable takeaways

### Response Synthesis

- Provide executive summary first
- Build from simple to complex
- Note areas not covered by results
- Suggest further exploration paths
- Always cite sources for verification

### For Learning Scenarios

- Start with conceptual overview
- Provide examples throughout
- Build mental model before details
- Connect new concepts to familiar ones

### For Decision-Making Scenarios

- Present decision criteria clearly
- Show trade-offs explicitly
- Highlight risks and considerations
- Recommend approach when appropriate
- Cite authoritative sources for critical decisions

# Focused Query Strategies

This document provides detailed guidance for focused, high-precision search strategies when querying the pod network knowledge base. Use these strategies when the user has specific, well-defined questions.

## Strategy 1: Precision Search

Use when the user has a very specific technical question with known terminology.

### Parameters

- `min_relevance`: 0.7-0.8 (high threshold)
- `limit`: 3-5 (focused results)

### Best For

- Specific API usage questions
- Exact error messages or warnings
- Particular function or modifier behavior
- Precise syntax questions
- Looking for exact implementations

### Query Formulation Guidelines

- Include exact technical terms and function names
- Specify pod-specific terms if relevant (e.g., "pod RPC", "pod indexer")
- Use precise terminology from the domain
- Keep query focused on single concept

### Examples

#### Example 1: Specific Implementation Question

**User query**: "How do I define a function in a pod contract?"

**Query formulation**: "pod contract function definition syntax"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod contract function definition syntax"
   - `limit`: 5
   - `min_relevance`: 0.7
2. Expect 3-5 highly relevant results about:
   - pod function syntax
   - Function parameters and return types
   - Function implementation examples
3. Synthesize answer focusing on the most relevant pattern
4. Cite sources using `source_title` and `source_url`
5. Include code example from highest-relevance result

**Expected outcome**: 3-5 results with relevance scores >0.7, containing specific code examples for pod contract functions.

#### Example 2: Compiler Error

**User query**: "Why won't my pod contract compile?"

**Query formulation**: "pod contract compilation error debugging"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod contract compilation error debugging"
   - `limit`: 5
   - `min_relevance`: 0.7
2. Expect results explaining:
   - Common compilation errors
   - Syntax issues and fixes
   - Best practices to avoid errors
3. Present highest-relevance solution first
4. Include code examples showing correct syntax

**Expected outcome**: Focused results explaining common compilation errors and providing actionable solutions.

#### Example 3: pod API Usage

**User query**: "How do I query pod network state using RPC?"

**Query formulation**: "pod RPC methods state query usage"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod RPC methods state query usage"
   - `limit`: 5
   - `min_relevance`: 0.75
2. Expect results about:
   - Available RPC methods
   - State query patterns
   - Implementation examples
3. Structure answer around practical usage
4. Include RPC endpoints, parameters, and response formats

**Expected outcome**: Precise documentation about pod RPC methods with working examples.

## Strategy 2: Quick Answer

Use when the user needs a fast answer to a straightforward question.

### Parameters

- `min_relevance`: 0.6-0.7 (solid relevance)
- `limit`: 3-5 (concise results)

### Best For

- Quick syntax lookups
- Common pattern verification
- Standard implementation checks
- Simple "how-to" questions
- Basic concept explanations

### Query Formulation Guidelines

- Use simple, direct terminology
- Focus on the immediate question
- Include the language/framework name
- Keep query short and specific

### Examples

#### Example 1: Syntax Lookup

**User query**: "How do I work with pod contract events?"

**Query formulation**: "pod contract event syntax usage"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod contract event syntax usage"
   - `limit`: 3
   - `min_relevance`: 0.65
2. Expect results showing:
   - Event declaration syntax
   - Emit statement usage
   - Simple examples
3. Provide concise answer with syntax example
4. Cite source for further reading

**Expected outcome**: 2-3 results with clear syntax examples ready to use immediately.

#### Example 2: Data Structure Syntax

**User query**: "What data structures are available in pod contracts?"

**Query formulation**: "pod contract data structures types"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod contract data structures types"
   - `limit`: 3
   - `min_relevance`: 0.65
2. Expect results showing:
   - Mapping declaration syntax
   - Key and value type specifications
   - Common usage patterns
3. Provide quick answer with syntax and example
4. Include note about mapping limitations if present in results

**Expected outcome**: Clear, immediate answer about mapping syntax.

#### Example 3: Function Comparison

**User query**: "How do I handle errors in pod contracts?"

**Query formulation**: "pod contract error handling best practices"

**Execution**:

1. Call `semantic_search`:
   - `query`: "pod contract error handling best practices"
   - `limit`: 5
   - `min_relevance`: 0.65
2. Expect results explaining:
   - Differences in gas refunds
   - When to use each
   - Error handling patterns
3. Structure answer as comparison table or bullet points
4. Include practical usage guidelines

**Expected outcome**: Quick, actionable guidance on when to use require vs assert.

## When to Use Focused Strategies

Choose focused strategies when:

1. **User knows exactly what they're looking for**
   - Specific function names
   - Exact error messages
   - Precise technical terms

2. **Question has a definitive answer**
   - Syntax questions
   - API usage
   - Standard patterns

3. **Time is important**
   - User needs quick answer
   - Simple verification needed
   - Straightforward how-to

4. **Context is clear**
   - No ambiguity in question
   - Technical terms are correct
   - Domain is well-understood

## Quality Indicators

### High-Quality Results (Relevance >0.7)

- Exact matches for technical terms
- Code examples present
- Clear, actionable guidance
- Source is authoritative (official docs, well-known libraries)

### Acceptable Results (Relevance 0.6-0.7)

- Close matches for concepts
- General guidance present
- May need minor adaptation
- Verify against multiple sources

### Low-Quality Results (Relevance <0.6)

- Consider using Broad or Refined strategies instead
- Results may be tangentially related
- Require significant interpretation
- Signal: query may need refinement

## Best Practices

### Query Formulation

- Include exact function/class names when known
- Add pod-specific terms (pod RPC, pod indexer, etc.)
- Use technical vocabulary, not colloquial terms
- Keep focused on single concept

### Result Handling

- Present highest-relevance result first
- Include working code example if available
- Cite source for verification
- Note if multiple valid approaches exist

### Response Synthesis

- Be concise—user wants quick answer
- Lead with the solution, not background
- Include code snippet if present in results
- Provide source URL for deeper learning

---
name: test-agent
description: A test agent for validation
arguments:
  - name: task
    description: Type of task to perform
    required: false
  - name: framework
    description: Framework to use
    default: typescript
---

# Test Agent

You are a test agent for the rigging-mcp server.

Current task: {{task}}
Using framework: {{framework}}

This is a test agent used for integration testing.

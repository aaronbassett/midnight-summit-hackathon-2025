---
name: test-skill
description: A test skill for validation
parameters:
  type: object
  properties:
    query:
      type: string
      description: Query parameter
    limit:
      type: integer
      description: Maximum results
      default: 5
  required:
    - query
---

# Test Skill

This is a test skill used for integration testing of the rigging-mcp server.

## Usage

Call this skill with a query parameter to test the system.

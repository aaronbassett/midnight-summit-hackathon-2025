// Integration tests for skill and agent loaders
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadSkills } from '../../dist/loaders/skills.js';
import { loadAgents } from '../../dist/loaders/agents.js';

describe('Loaders', () => {
  let tempDir: string;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rigging-mcp-loaders-test-'));
  });

  after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('loadSkills()', () => {
    it('should load skill with SKILL.md and references', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'skills-1');
      const skillDir = join(skillsDir, 'test-skill');
      const refsDir = join(skillDir, 'references');
      await mkdir(refsDir, { recursive: true });

      const skillContent = `---
name: test-skill
description: A test skill
parameters:
  type: object
  properties:
    query:
      type: string
---

# Test Skill

This is a test.`;

      await writeFile(join(skillDir, 'SKILL.md'), skillContent);
      await writeFile(join(refsDir, 'ref1.md'), '# Reference 1\n\nContent');
      await writeFile(join(refsDir, 'ref2.md'), '# Reference 2\n\nMore content');

      // Act
      const skills = await loadSkills(skillsDir, 'test');

      // Assert
      assert.strictEqual(skills.length, 1);
      assert.strictEqual(skills[0].name, 'test-skill');
      assert.strictEqual(skills[0].namespace, 'test');
      assert.strictEqual(skills[0].frontmatter.name, 'test-skill');
      assert.ok(skills[0].content.includes('This is a test'));
      assert.strictEqual(skills[0].references.length, 2);
      assert.strictEqual(skills[0].references[0].name, 'ref1');
      assert.strictEqual(skills[0].references[1].name, 'ref2');
      assert.strictEqual(skills[0].uri, 'mcp://rigging/test/resources/test-skill');
    });

    it('should load skill without references directory', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'skills-2');
      const skillDir = join(skillsDir, 'no-refs');
      await mkdir(skillDir, { recursive: true });

      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: no-refs
---

Content`
      );

      // Act
      const skills = await loadSkills(skillsDir, 'test');

      // Assert
      assert.strictEqual(skills.length, 1);
      assert.strictEqual(skills[0].name, 'no-refs');
      assert.strictEqual(skills[0].references.length, 0);
    });

    it('should skip directories without SKILL.md', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'skills-3');
      const validSkill = join(skillsDir, 'valid');
      const invalidDir = join(skillsDir, 'no-skill-md');
      await mkdir(validSkill, { recursive: true });
      await mkdir(invalidDir, { recursive: true });

      await writeFile(join(validSkill, 'SKILL.md'), '---\nname: valid\n---\nContent');
      await writeFile(join(invalidDir, 'other.md'), 'Not a skill');

      // Act
      const skills = await loadSkills(skillsDir, 'test');

      // Assert
      assert.strictEqual(skills.length, 1);
      assert.strictEqual(skills[0].name, 'valid');
    });

    it('should skip non-.md files in references directory', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'skills-4');
      const skillDir = join(skillsDir, 'mixed-refs');
      const refsDir = join(skillDir, 'references');
      await mkdir(refsDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), '---\nname: test\n---\nX');
      await writeFile(join(refsDir, 'valid.md'), 'Valid reference');
      await writeFile(join(refsDir, 'readme.txt'), 'Not a reference');
      await writeFile(join(refsDir, 'data.json'), '{}');

      // Act
      const skills = await loadSkills(skillsDir, 'test');

      // Assert
      assert.strictEqual(skills.length, 1);
      assert.strictEqual(skills[0].references.length, 1);
      assert.strictEqual(skills[0].references[0].name, 'valid');
    });

    it('should handle empty skills directory', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'skills-empty');
      await mkdir(skillsDir, { recursive: true });

      // Act
      const skills = await loadSkills(skillsDir, 'test');

      // Assert
      assert.strictEqual(skills.length, 0);
    });

    it('should extract parameters from frontmatter', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'skills-params');
      const skillDir = join(skillsDir, 'with-params');
      await mkdir(skillDir, { recursive: true });

      const content = `---
parameters:
  type: object
  properties:
    limit:
      type: integer
      default: 10
---

Content`;
      await writeFile(join(skillDir, 'SKILL.md'), content);

      // Act
      const skills = await loadSkills(skillsDir, 'test');

      // Assert
      assert.strictEqual(skills.length, 1);
      assert.ok(skills[0].parameters);
      assert.strictEqual((skills[0].parameters as any).type, 'object');
    });
  });

  describe('loadAgents()', () => {
    it('should load agent with frontmatter arguments', async () => {
      // Arrange
      const agentsDir = join(tempDir, 'agents-1');
      await mkdir(agentsDir, { recursive: true });

      const agentContent = `---
name: test-agent
description: A test agent
arguments:
  - name: task
    description: Task to perform
    required: false
  - name: framework
    default: typescript
---

# Test Agent

You are a test agent.`;

      await writeFile(join(agentsDir, 'test-agent.md'), agentContent);

      // Act
      const agents = await loadAgents(agentsDir, 'test');

      // Assert
      assert.strictEqual(agents.length, 1);
      assert.strictEqual(agents[0].name, 'test-agent');
      assert.strictEqual(agents[0].namespace, 'test');
      assert.strictEqual(agents[0].frontmatter.name, 'test-agent');
      assert.ok(agents[0].content.includes('You are a test agent'));
      assert.strictEqual(agents[0].arguments?.length, 2);
      assert.strictEqual(agents[0].arguments?.[0].name, 'task');
      assert.strictEqual(agents[0].arguments?.[1].default, 'typescript');
      assert.strictEqual(agents[0].uri, 'mcp://rigging/test/prompts/test-agent');
    });

    it('should load agent without arguments', async () => {
      // Arrange
      const agentsDir = join(tempDir, 'agents-2');
      await mkdir(agentsDir, { recursive: true });

      const content = `---
name: simple
---

Simple agent.`;
      await writeFile(join(agentsDir, 'simple.md'), content);

      // Act
      const agents = await loadAgents(agentsDir, 'test');

      // Assert
      assert.strictEqual(agents.length, 1);
      assert.strictEqual(agents[0].name, 'simple');
      assert.strictEqual(agents[0].arguments, undefined);
    });

    it('should skip non-.md files', async () => {
      // Arrange
      const agentsDir = join(tempDir, 'agents-3');
      await mkdir(agentsDir, { recursive: true });

      await writeFile(join(agentsDir, 'valid.md'), '---\nname: valid\n---\nX');
      await writeFile(join(agentsDir, 'readme.txt'), 'Not an agent');
      await writeFile(join(agentsDir, 'config.json'), '{}');

      // Act
      const agents = await loadAgents(agentsDir, 'test');

      // Assert
      assert.strictEqual(agents.length, 1);
      assert.strictEqual(agents[0].name, 'valid');
    });

    it('should handle empty agents directory', async () => {
      // Arrange
      const agentsDir = join(tempDir, 'agents-empty');
      await mkdir(agentsDir, { recursive: true });

      // Act
      const agents = await loadAgents(agentsDir, 'test');

      // Assert
      assert.strictEqual(agents.length, 0);
    });

    it('should extract agent name from filename', async () => {
      // Arrange
      const agentsDir = join(tempDir, 'agents-filename');
      await mkdir(agentsDir, { recursive: true });

      await writeFile(join(agentsDir, 'my-custom-agent.md'), '---\ndesc: test\n---\nContent');

      // Act
      const agents = await loadAgents(agentsDir, 'test');

      // Assert
      assert.strictEqual(agents.length, 1);
      assert.strictEqual(agents[0].name, 'my-custom-agent');
    });

    it('should handle malformed arguments gracefully', async () => {
      // Arrange
      const agentsDir = join(tempDir, 'agents-bad-args');
      await mkdir(agentsDir, { recursive: true });

      // Invalid arguments (missing name)
      const content = `---
arguments:
  - description: No name
  - name: valid
    required: true
---

Content`;
      await writeFile(join(agentsDir, 'test.md'), content);

      // Act
      const agents = await loadAgents(agentsDir, 'test');

      // Assert
      assert.strictEqual(agents.length, 1);
      // Should filter out invalid arguments without names
      assert.strictEqual(agents[0].arguments?.length, 1);
      assert.strictEqual(agents[0].arguments?.[0].name, 'valid');
    });
  });
});

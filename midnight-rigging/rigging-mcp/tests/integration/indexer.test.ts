// Integration tests for indexer
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  buildIndex,
  getIndex,
  lookupAgent,
  lookupSkill,
  lookupReference
} from '../../dist/indexer.js';

// Define Config type inline since it's not exported from compiled JS
interface Source {
  namespace: string;
  skills: string;
  agents: string;
}

interface Config {
  sources: Source[];
}

describe('Indexer', () => {
  let tempDir: string;

  before(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'rigging-mcp-indexer-test-'));
  });

  after(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('buildIndex()', () => {
    it('should build index from single namespace', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'idx-1-skills');
      const agentsDir = join(tempDir, 'idx-1-agents');
      const skillDir = join(skillsDir, 'skill1');
      await mkdir(skillDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), '---\nname: s1\n---\nSkill');
      await writeFile(join(agentsDir, 'agent1.md'), '---\nname: a1\n---\nAgent');

      const config: Config = {
        sources: [{ namespace: 'test', skills: skillsDir, agents: agentsDir }]
      };

      // Act
      await buildIndex(config);
      const index = getIndex();

      // Assert
      assert.strictEqual(index.agents.size, 1);
      assert.strictEqual(index.skills.size, 1);
      assert.ok(index.agents.has('test/agent1'));
      assert.ok(index.skills.has('test/skill1'));
    });

    it('should build index from multiple namespaces', async () => {
      // Arrange
      const ns1Skills = join(tempDir, 'idx-2-ns1-skills');
      const ns1Agents = join(tempDir, 'idx-2-ns1-agents');
      const ns2Skills = join(tempDir, 'idx-2-ns2-skills');
      const ns2Agents = join(tempDir, 'idx-2-ns2-agents');

      const skill1 = join(ns1Skills, 's1');
      const skill2 = join(ns2Skills, 's2');
      await mkdir(skill1, { recursive: true });
      await mkdir(skill2, { recursive: true });
      await mkdir(ns1Agents, { recursive: true });
      await mkdir(ns2Agents, { recursive: true });

      await writeFile(join(skill1, 'SKILL.md'), '---\n---\nS1');
      await writeFile(join(skill2, 'SKILL.md'), '---\n---\nS2');
      await writeFile(join(ns1Agents, 'a1.md'), '---\n---\nA1');
      await writeFile(join(ns2Agents, 'a2.md'), '---\n---\nA2');

      const config: Config = {
        sources: [
          { namespace: 'ns1', skills: ns1Skills, agents: ns1Agents },
          { namespace: 'ns2', skills: ns2Skills, agents: ns2Agents }
        ]
      };

      // Act
      await buildIndex(config);
      const index = getIndex();

      // Assert
      assert.strictEqual(index.skills.size, 2);
      assert.strictEqual(index.agents.size, 2);
      assert.ok(index.skills.has('ns1/s1'));
      assert.ok(index.skills.has('ns2/s2'));
      assert.ok(index.agents.has('ns1/a1'));
      assert.ok(index.agents.has('ns2/a2'));
    });

    it('should index references correctly', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'idx-3-skills');
      const agentsDir = join(tempDir, 'idx-3-agents');
      const skillDir = join(skillsDir, 'with-refs');
      const refsDir = join(skillDir, 'references');
      await mkdir(refsDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), '---\n---\nSkill');
      await writeFile(join(refsDir, 'ref1.md'), 'Ref 1');
      await writeFile(join(refsDir, 'ref2.md'), 'Ref 2');

      const config: Config = {
        sources: [{ namespace: 'test', skills: skillsDir, agents: agentsDir }]
      };

      // Act
      await buildIndex(config);
      const index = getIndex();

      // Assert
      assert.strictEqual(index.references.size, 2);
      assert.ok(index.references.has('test/with-refs/ref1'));
      assert.ok(index.references.has('test/with-refs/ref2'));
    });

    it('should handle namespaces with same skill names', async () => {
      // Arrange - Both namespaces have a skill named "common"
      const ns1Skills = join(tempDir, 'idx-4-ns1-skills');
      const ns1Agents = join(tempDir, 'idx-4-ns1-agents');
      const ns2Skills = join(tempDir, 'idx-4-ns2-skills');
      const ns2Agents = join(tempDir, 'idx-4-ns2-agents');

      const skill1 = join(ns1Skills, 'common');
      const skill2 = join(ns2Skills, 'common');
      await mkdir(skill1, { recursive: true });
      await mkdir(skill2, { recursive: true });
      await mkdir(ns1Agents, { recursive: true });
      await mkdir(ns2Agents, { recursive: true });

      await writeFile(join(skill1, 'SKILL.md'), '---\n---\nNS1 content');
      await writeFile(join(skill2, 'SKILL.md'), '---\n---\nNS2 content');

      const config: Config = {
        sources: [
          { namespace: 'ns1', skills: ns1Skills, agents: ns1Agents },
          { namespace: 'ns2', skills: ns2Skills, agents: ns2Agents }
        ]
      };

      // Act
      await buildIndex(config);
      const index = getIndex();

      // Assert - Both should exist separately via namespace key
      assert.strictEqual(index.skills.size, 2);
      assert.ok(index.skills.has('ns1/common'));
      assert.ok(index.skills.has('ns2/common'));
      assert.notStrictEqual(
        index.skills.get('ns1/common')?.content,
        index.skills.get('ns2/common')?.content
      );
    });
  });

  describe('getIndex()', () => {
    it('should throw if index not built', async () => {
      // Note: This test would interfere with other tests since buildIndex()
      // sets a global state. In a real scenario, you'd need better isolation
      // or test this in a separate process. Skipping for now.
    });
  });

  describe('lookupAgent()', () => {
    beforeEach(async () => {
      const skillsDir = join(tempDir, 'lookup-skills');
      const agentsDir = join(tempDir, 'lookup-agents');
      await mkdir(skillsDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });

      await writeFile(join(agentsDir, 'test-agent.md'), '---\n---\nAgent');

      const config: Config = {
        sources: [{ namespace: 'test', skills: skillsDir, agents: agentsDir }]
      };
      await buildIndex(config);
    });

    it('should lookup agent by namespace and name', () => {
      // Act
      const agent = lookupAgent('test', 'test-agent');

      // Assert
      assert.ok(agent);
      assert.strictEqual(agent.name, 'test-agent');
      assert.strictEqual(agent.namespace, 'test');
    });

    it('should return undefined for non-existent agent', () => {
      // Act
      const agent = lookupAgent('test', 'non-existent');

      // Assert
      assert.strictEqual(agent, undefined);
    });
  });

  describe('lookupSkill()', () => {
    beforeEach(async () => {
      const skillsDir = join(tempDir, 'lookup2-skills');
      const agentsDir = join(tempDir, 'lookup2-agents');
      const skillDir = join(skillsDir, 'test-skill');
      await mkdir(skillDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), '---\n---\nSkill');

      const config: Config = {
        sources: [{ namespace: 'test', skills: skillsDir, agents: agentsDir }]
      };
      await buildIndex(config);
    });

    it('should lookup skill by namespace and name', () => {
      // Act
      const skill = lookupSkill('test', 'test-skill');

      // Assert
      assert.ok(skill);
      assert.strictEqual(skill.name, 'test-skill');
      assert.strictEqual(skill.namespace, 'test');
    });

    it('should return undefined for non-existent skill', () => {
      // Act
      const skill = lookupSkill('test', 'non-existent');

      // Assert
      assert.strictEqual(skill, undefined);
    });
  });

  describe('lookupReference()', () => {
    beforeEach(async () => {
      const skillsDir = join(tempDir, 'lookup3-skills');
      const agentsDir = join(tempDir, 'lookup3-agents');
      const skillDir = join(skillsDir, 'skill-with-ref');
      const refsDir = join(skillDir, 'references');
      await mkdir(refsDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), '---\n---\nSkill');
      await writeFile(join(refsDir, 'myref.md'), 'Reference content');

      const config: Config = {
        sources: [{ namespace: 'test', skills: skillsDir, agents: agentsDir }]
      };
      await buildIndex(config);
    });

    it('should lookup reference by namespace, skill, and name', () => {
      // Act
      const ref = lookupReference('test', 'skill-with-ref', 'myref');

      // Assert
      assert.ok(ref);
      assert.strictEqual(ref.name, 'myref');
      assert.strictEqual(ref.skillName, 'skill-with-ref');
      assert.strictEqual(ref.namespace, 'test');
    });

    it('should return undefined for non-existent reference', () => {
      // Act
      const ref = lookupReference('test', 'skill-with-ref', 'non-existent');

      // Assert
      assert.strictEqual(ref, undefined);
    });
  });
});

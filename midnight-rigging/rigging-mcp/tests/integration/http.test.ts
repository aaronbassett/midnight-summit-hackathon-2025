// Integration tests for HTTP endpoints using test fixtures
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'path';
import { loadConfig } from '../../dist/config.js';
import { buildIndex, lookupAgent, lookupSkill, lookupReference } from '../../dist/indexer.js';
import { handleDiscovery } from '../../dist/discovery.js';
import type { IncomingMessage, ServerResponse } from 'http';

describe('HTTP Endpoints (using test fixtures)', () => {
  before(async () => {
    // Build index directly using test fixtures paths
    // (skip the fixtures config since it references midnight-plugin)
    const fixturesDir = resolve(process.cwd(), 'tests/fixtures');
    const config = {
      sources: [
        {
          namespace: 'test',
          skills: resolve(fixturesDir, 'skills'),
          agents: resolve(fixturesDir, 'agents')
        }
      ]
    };

    // Build index
    await buildIndex(config);
  });

  describe('Discovery Endpoint', () => {
    it('should return discovery response with URIs', async () => {
      // Arrange
      let responseData = '';
      const mockRes = {
        writeHead: () => {},
        end: (data: string) => {
          responseData = data;
        }
      } as unknown as ServerResponse;

      const mockReq = {} as IncomingMessage;

      // Act
      await handleDiscovery(mockReq, mockRes);

      // Assert
      const response = JSON.parse(responseData);
      assert.ok(response.prompts);
      assert.ok(response.resources);
      assert.ok(response.references);
      assert.ok(Array.isArray(response.prompts));
      assert.ok(Array.isArray(response.resources));
      assert.ok(Array.isArray(response.references));

      // Should contain test fixtures
      assert.ok(response.prompts.includes('mcp://rigging/test/prompts/test-agent'));
      assert.ok(response.resources.includes('mcp://rigging/test/resources/test-skill'));
    });
  });

  describe('Lookup Functions', () => {
    it('should lookup test agent from fixtures', () => {
      // Act
      const agent = lookupAgent('test', 'test-agent');

      // Assert
      assert.ok(agent);
      assert.strictEqual(agent.name, 'test-agent');
      assert.strictEqual(agent.namespace, 'test');
      assert.strictEqual(agent.uri, 'mcp://rigging/test/prompts/test-agent');
      assert.ok(agent.content.includes('test agent'));
      assert.ok(agent.arguments);
      assert.strictEqual(agent.arguments?.length, 2);
    });

    it('should lookup test skill from fixtures', () => {
      // Act
      const skill = lookupSkill('test', 'test-skill');

      // Assert
      assert.ok(skill);
      assert.strictEqual(skill.name, 'test-skill');
      assert.strictEqual(skill.namespace, 'test');
      assert.strictEqual(skill.uri, 'mcp://rigging/test/resources/test-skill');
      assert.ok(skill.content.includes('test skill'));
      assert.ok(skill.parameters);
    });

    it('should lookup test reference from fixtures', () => {
      // Act
      const ref = lookupReference('test', 'test-skill', 'test-reference');

      // Assert
      assert.ok(ref);
      assert.strictEqual(ref.name, 'test-reference');
      assert.strictEqual(ref.skillName, 'test-skill');
      assert.strictEqual(ref.namespace, 'test');
      assert.strictEqual(ref.uri, 'mcp://rigging/test/references/test-skill/test-reference');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = lookupAgent('test', 'non-existent');
      assert.strictEqual(agent, undefined);
    });

    it('should return undefined for non-existent skill', () => {
      const skill = lookupSkill('test', 'non-existent');
      assert.strictEqual(skill, undefined);
    });

    it('should return undefined for wrong namespace', () => {
      const agent = lookupAgent('wrong-namespace', 'test-agent');
      assert.strictEqual(agent, undefined);
    });
  });
});

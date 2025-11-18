/**
 * Plugin Structure Tests
 *
 * Validates that required plugin files exist and are valid.
 * Prevents broken plugin structure from being deployed.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PLUGIN_ROOT = join(process.cwd(), 'midnight-plugin');

describe('Plugin Structure', () => {
  describe('Required Files', () => {
    it('should have plugin manifest', () => {
      const manifestPath = join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
      expect(existsSync(manifestPath), 'plugin.json should exist').toBe(true);
    });

    it('should have MCP configuration', () => {
      const mcpPath = join(PLUGIN_ROOT, '.mcp.json');
      expect(existsSync(mcpPath), '.mcp.json should exist').toBe(true);
    });

    it('should have servers package.json', () => {
      const pkgPath = join(PLUGIN_ROOT, 'servers', 'package.json');
      expect(existsSync(pkgPath), 'servers/package.json should exist').toBe(true);
    });

    it('should have MCP server (compiled)', () => {
      const serverPath = join(PLUGIN_ROOT, 'servers', 'dist', 'rag', 'index.js');
      expect(existsSync(serverPath), 'servers/dist/rag/index.js should exist').toBe(true);
    });

    it('should have skill definition', () => {
      const skillPath = join(PLUGIN_ROOT, 'skills', 'rag-query', 'SKILL.md');
      expect(existsSync(skillPath), 'skills/rag-query/SKILL.md should exist').toBe(true);
    });

    it('should NOT have bundled data directory (remote architecture)', () => {
      const dataPath = join(PLUGIN_ROOT, 'data', 'chroma');
      expect(
        existsSync(dataPath),
        'data/chroma should not exist in v2.0.0+ (remote server architecture)'
      ).toBe(false);
    });
  });

  describe('Plugin Manifest', () => {
    it('should have valid JSON', () => {
      const manifestPath = join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
      const content = readFileSync(manifestPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should have required fields', () => {
      const manifestPath = join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

      expect(manifest.name).toBe('midnight-plugin');
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/); // Semver
      expect(manifest.description).toBeTruthy();
      expect(manifest.license).toBe('MIT');
    });

    it('should reference MCP config', () => {
      const manifestPath = join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

      expect(manifest.mcpServers).toBe('./.mcp.json');
    });
  });

  describe('MCP Configuration', () => {
    it('should have valid JSON', () => {
      const mcpPath = join(PLUGIN_ROOT, '.mcp.json');
      const content = readFileSync(mcpPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should define midnight-rag server', () => {
      const mcpPath = join(PLUGIN_ROOT, '.mcp.json');
      const config = JSON.parse(readFileSync(mcpPath, 'utf-8'));

      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers['midnight-rag']).toBeDefined();
      expect(config.mcpServers['midnight-rag'].command).toBe('node');
      expect(config.mcpServers['midnight-rag'].args).toContain(
        '${CLAUDE_PLUGIN_ROOT}/servers/dist/rag/index.js'
      );
    });
  });

  describe('Servers Package Configuration', () => {
    it('should have valid JSON', () => {
      const pkgPath = join(PLUGIN_ROOT, 'servers', 'package.json');
      const content = readFileSync(pkgPath, 'utf-8');

      expect(() => JSON.parse(content)).not.toThrow();
    });

    it('should use ES modules', () => {
      const pkgPath = join(PLUGIN_ROOT, 'servers', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.type).toBe('module');
    });

    it('should have required dependencies (remote architecture)', () => {
      const pkgPath = join(PLUGIN_ROOT, 'servers', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      // v2.0.0+ uses remote server, plugin only needs MCP SDK and validation
      expect(pkg.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
      expect(pkg.dependencies['zod']).toBeDefined();
      // chromadb is NOT needed in plugin (runs on remote server)
      expect(pkg.dependencies['chromadb']).toBeUndefined();
    });

    it('should specify Node.js version requirement', () => {
      const pkgPath = join(PLUGIN_ROOT, 'servers', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      expect(pkg.engines?.node).toBeDefined();
      expect(pkg.engines.node).toMatch(/>=24/); // Node 24+
    });
  });

  describe('No Forbidden Files', () => {
    it('should not have README.md in plugin directory', () => {
      const readmePath = join(PLUGIN_ROOT, 'README.md');
      expect(
        existsSync(readmePath),
        "README.md should not exist in plugin (Claude doesn't read it)"
      ).toBe(false);
    });

    it('should not have DEVELOPMENT.md in plugin directory', () => {
      const devPath = join(PLUGIN_ROOT, 'DEVELOPMENT.md');
      expect(existsSync(devPath), 'DEVELOPMENT.md should not exist in plugin').toBe(false);
    });

    it('should not have CONTRIBUTING.md in plugin directory', () => {
      const contribPath = join(PLUGIN_ROOT, 'CONTRIBUTING.md');
      expect(existsSync(contribPath), 'CONTRIBUTING.md should not exist in plugin').toBe(false);
    });
  });
});

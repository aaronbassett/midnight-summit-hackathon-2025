/**
 * Startup indexer - builds in-memory index of all resources
 */

import { Config, Index, Agent, Skill, Reference, DiscoveryResponse } from './types.js';
import { loadAgents } from './loaders/agents.js';
import { loadSkills } from './loaders/skills.js';
import { getLog } from './utils/logger.js';
import { clearAllCaches, setDiscoveryCache } from './utils/cache.js';

/**
 * Global in-memory index
 */
let globalIndex: Index | null = null;

/**
 * Ready state flag - prevents race conditions during index build
 */
let indexReady = false;

/**
 * Build index from config
 *
 * Loads all agents and skills from all configured sources,
 * builds namespace-aware lookup maps, and caches discovery response.
 *
 * @param config - Server configuration
 */
export async function buildIndex(config: Config): Promise<void> {
  const log = getLog();

  // Mark as not ready and clear all caches
  indexReady = false;
  clearAllCaches();

  const agents = new Map<string, Agent>();
  const skills = new Map<string, Skill>();
  const references = new Map<string, Reference>();

  // Process each source
  for (const source of config.sources) {
    const { namespace } = source;

    log.info(`Loading source '${namespace}'...`);

    // Load agents
    const sourceAgents = await loadAgents(source.agents, namespace);
    for (const agent of sourceAgents) {
      const key = `${namespace}/${agent.name}`;
      agents.set(key, agent);
    }

    // Load skills
    const sourceSkills = await loadSkills(source.skills, namespace);
    for (const skill of sourceSkills) {
      const key = `${namespace}/${skill.name}`;
      skills.set(key, skill);

      // Index references
      for (const ref of skill.references) {
        const refKey = `${namespace}/${skill.name}/${ref.name}`;
        references.set(refKey, ref);
      }
    }

    log.info(
      `Loaded ${sourceAgents.length} agents, ${sourceSkills.length} skills from '${namespace}'`
    );
  }

  // Store global index
  globalIndex = { agents, skills, references };

  // Build and cache discovery response
  const discoveryResponse: DiscoveryResponse = {
    prompts: [],
    resources: [],
    references: []
  };

  for (const agent of agents.values()) {
    discoveryResponse.prompts.push(agent.uri);
  }

  for (const skill of skills.values()) {
    discoveryResponse.resources.push(skill.uri);
  }

  for (const reference of references.values()) {
    discoveryResponse.references.push(reference.uri);
  }

  setDiscoveryCache(discoveryResponse);

  // Mark as ready
  indexReady = true;

  log.info(
    `Index built: ${agents.size} agents, ${skills.size} skills, ${references.size} references`
  );
}

/**
 * Get the global index
 *
 * @returns Global index
 * @throws Error if index not built or not ready
 */
export function getIndex(): Index {
  if (!globalIndex || !indexReady) {
    throw new Error('Index not ready. Server is still building the index.');
  }
  return globalIndex;
}

/**
 * Check if index is ready
 *
 * @returns true if index is built and ready to serve requests
 */
export function isIndexReady(): boolean {
  return indexReady && globalIndex !== null;
}

/**
 * Lookup agent by namespace and name
 *
 * @param namespace - Namespace of the agent
 * @param name - Name of the agent
 * @returns Agent if found, undefined otherwise
 */
export function lookupAgent(namespace: string, name: string): Agent | undefined {
  const index = getIndex();
  return index.agents.get(`${namespace}/${name}`);
}

/**
 * Lookup skill by namespace and name
 *
 * @param namespace - Namespace of the skill
 * @param name - Name of the skill
 * @returns Skill if found, undefined otherwise
 */
export function lookupSkill(namespace: string, name: string): Skill | undefined {
  const index = getIndex();
  return index.skills.get(`${namespace}/${name}`);
}

/**
 * Lookup reference by namespace, skill name, and reference name
 *
 * @param namespace - Namespace of the skill
 * @param skillName - Name of the skill containing the reference
 * @param referenceName - Name of the reference document
 * @returns Reference if found, undefined otherwise
 */
export function lookupReference(
  namespace: string,
  skillName: string,
  referenceName: string
): Reference | undefined {
  const index = getIndex();
  return index.references.get(`${namespace}/${skillName}/${referenceName}`);
}

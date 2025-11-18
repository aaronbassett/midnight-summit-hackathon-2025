/**
 * Core types for rigging-mcp server
 */

/**
 * Argument definition for agent prompts
 */
export interface Argument {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
}

/**
 * Agent entity representing an AI personality/instruction set
 */
export interface Agent {
  name: string;
  namespace: string;
  frontmatter: Record<string, unknown>;
  content: string;
  arguments?: Argument[];
  uri: string;
}

/**
 * Reference document for a skill
 */
export interface Reference {
  name: string;
  skillName: string;
  namespace: string;
  content: string;
  uri: string;
}

/**
 * Skill entity representing a capability definition
 */
export interface Skill {
  name: string;
  namespace: string;
  frontmatter: Record<string, unknown>;
  content: string;
  parameters?: Record<string, unknown>;
  references: Reference[];
  uri: string;
}

/**
 * Source configuration for loading skills and agents
 */
export interface Source {
  namespace: string;
  description?: string;
  skills: string;
  agents: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port?: number;
  host?: string;
}

/**
 * Complete rigging-mcp configuration
 */
export interface Config {
  sources: Source[];
  server?: ServerConfig;
}

/**
 * Discovery response structure
 */
export interface DiscoveryResponse {
  prompts: string[];
  resources: string[];
  references: string[];
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * In-memory index for fast lookups
 */
export interface Index {
  agents: Map<string, Agent>;
  skills: Map<string, Skill>;
  references: Map<string, Reference>;
}

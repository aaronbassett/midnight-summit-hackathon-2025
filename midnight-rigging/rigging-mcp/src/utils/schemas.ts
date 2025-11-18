/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod';

/**
 * Argument schema
 */
export const ArgumentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  default: z.string().optional()
});

/**
 * Source schema
 */
export const SourceSchema = z.object({
  namespace: z.string().regex(/^[a-z0-9-]+$/, {
    message: 'Namespace must be lowercase alphanumeric with hyphens'
  }),
  description: z.string().optional(),
  skills: z.string(),
  agents: z.string()
});

/**
 * Server configuration schema
 */
export const ServerConfigSchema = z.object({
  port: z.number().int().positive().optional().default(3000),
  host: z.string().optional().default('localhost')
});

/**
 * Config schema
 */
export const ConfigSchema = z.object({
  sources: z.array(SourceSchema).min(1, {
    message: 'At least one source must be configured'
  }),
  server: ServerConfigSchema.optional()
});

/**
 * Agent frontmatter schema (flexible)
 */
export const AgentFrontmatterSchema = z.record(z.unknown());

/**
 * Skill frontmatter schema (flexible)
 */
export const SkillFrontmatterSchema = z.record(z.unknown());

/**
 * Reference validation schema
 */
export const ReferenceSchema = z.object({
  name: z.string(),
  skillName: z.string(),
  namespace: z.string(),
  content: z.string().min(1),
  uri: z.string()
});

/**
 * Agent validation schema
 */
export const AgentSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  frontmatter: z.record(z.unknown()),
  content: z.string().min(1),
  arguments: z.array(ArgumentSchema).optional(),
  uri: z.string()
});

/**
 * Skill validation schema
 */
export const SkillSchema = z.object({
  name: z.string(),
  namespace: z.string(),
  frontmatter: z.record(z.unknown()),
  content: z.string().min(1),
  parameters: z.record(z.unknown()).optional(),
  references: z.array(ReferenceSchema),
  uri: z.string()
});

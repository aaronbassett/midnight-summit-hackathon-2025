/**
 * Zod validation schemas for templating MCP server
 */

import { z } from 'zod';

/**
 * Schema for template variable definition
 */
export const variableDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1)
});

/**
 * Schema for optional variable definition
 */
export const optionalVariableDefinitionSchema = variableDefinitionSchema.extend({
  default: z.string()
});

/**
 * Schema for key file definition in structure
 */
export const keyFileDefinitionSchema = z.object({
  path: z.string().min(1),
  purpose: z.string().min(1)
});

/**
 * Schema for structure definition
 */
export const structureDefinitionSchema = z.object({
  overview: z.string().min(1),
  keyFiles: z.array(keyFileDefinitionSchema).min(1),
  commonCustomizations: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional()
});

/**
 * Schema for template metadata (template.yaml)
 */
export const templateMetadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().optional(),
  author: z.string().optional(),
  license: z.string().optional(),
  homepage: z.string().url().optional(),
  documentation: z.string().url().optional(),
  repository: z.string().url().optional(),
  bugs: z.string().url().optional(),
  keywords: z.array(z.string()).optional(),
  longDescription: z.string().optional(),
  useCases: z.array(z.string()).optional(),
  requiredVariables: z.array(variableDefinitionSchema).default([]),
  optionalVariables: z.array(optionalVariableDefinitionSchema).optional(),
  structure: structureDefinitionSchema.optional(),
  exampleStructure: z.array(z.string()).optional()
});

/**
 * Schema for render_template request
 */
export const renderRequestSchema = z.object({
  templateName: z.string().min(1).max(100),
  targetPath: z.string().min(1),
  variables: z.record(z.string())
});

/**
 * Schema for get_template_details request
 */
export const templateDetailsRequestSchema = z.object({
  templateName: z.string().min(1).max(100)
});

/**
 * Validate that user variables don't conflict with reserved system variable names
 * @param variableNames Array of user-provided variable names
 * @returns Array of conflicting variable names (empty if no conflicts)
 */
export function validateReservedVariableNames(variableNames: string[]): string[] {
  const reservedPattern = /^[A-Z_]+$/;
  return variableNames.filter(name => reservedPattern.test(name));
}

/**
 * Validate that all required variables are provided
 * @param required Array of required variable names
 * @param provided Object of provided variable values
 * @returns Array of missing variable names (empty if all provided)
 */
export function validateRequiredVariables(
  required: string[],
  provided: Record<string, string>
): string[] {
  return required.filter(name => !(name in provided));
}

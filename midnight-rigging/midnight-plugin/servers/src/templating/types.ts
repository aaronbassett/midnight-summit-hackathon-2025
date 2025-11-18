/**
 * Core types for the templating MCP server
 */

/**
 * Template metadata from template.yaml
 */
export interface TemplateMetadata {
  name: string;
  description: string;
  version?: string;
  author?: string;
  license?: string;
  homepage?: string;
  documentation?: string;
  repository?: string;
  bugs?: string;
  keywords?: string[];
  longDescription?: string;
  useCases?: string[];
  requiredVariables: VariableDefinition[];
  optionalVariables?: OptionalVariableDefinition[];
  structure?: StructureDefinition;
  exampleStructure?: string[];
}

/**
 * Required variable definition
 */
export interface VariableDefinition {
  name: string;
  description: string;
}

/**
 * Optional variable definition with default value
 */
export interface OptionalVariableDefinition extends VariableDefinition {
  default: string;
}

/**
 * Template structure definition for implementation guide
 */
export interface StructureDefinition {
  overview: string;
  keyFiles: KeyFileDefinition[];
  commonCustomizations?: string[];
  nextSteps?: string[];
}

/**
 * Key file definition in structure
 */
export interface KeyFileDefinition {
  path: string;
  purpose: string;
}

/**
 * Template list entry for list_templates tool
 */
export interface TemplateListEntry {
  name: string;
  description: string;
  hasError: boolean;
}

/**
 * Request for render_template tool
 */
export interface RenderRequest {
  templateName: string;
  targetPath: string;
  variables: Record<string, string>;
}

/**
 * Response from render_template tool
 */
export interface RenderResponse {
  filesCreated: number;
  directoriesCreated: number;
  targetPath: string;
  sanitizedPaths?: string[];
  warnings?: string[];
  implementationGuide: ImplementationGuide;
}

/**
 * Implementation guide for post-render UX
 */
export interface ImplementationGuide {
  overview: string;
  keyFiles: KeyFileDefinition[];
  commonCustomizations?: string[];
  nextSteps?: string[];
}

/**
 * Request for get_template_details tool
 */
export interface TemplateDetailsRequest {
  templateName: string;
}

/**
 * Response from get_template_details tool
 */
export interface TemplateDetailsResponse extends TemplateMetadata {
  systemVariables: string[];
}

/**
 * System variables available in all templates
 */
export const SYSTEM_VARIABLES = {
  // Path/Directory
  TARGET_DIR: 'Absolute path to render location',
  TARGET_NAME: 'Basename of target directory',
  HOME_DIR: "User's home directory",
  PATH_SEP: 'Platform path separator',

  // Template Info
  TEMPLATE_NAME: 'Template name from template.yaml',
  TEMPLATE_VERSION: 'Template version or empty string',

  // Date/Time
  CURRENT_DATE: 'ISO date YYYY-MM-DD',
  CURRENT_YEAR: '4-digit year',
  CURRENT_TIMESTAMP: 'ISO 8601 timestamp',

  // Platform
  OS_PLATFORM: 'process.platform (darwin/linux/win32/etc)',
  OS_ARCH: 'process.arch (x64/arm64/etc)',
  OS_TYPE: 'Human-readable (macOS/Linux/Windows)',
  SHELL_EXT: 'Recommended script extension (sh/bat/ps1)'
} as const;

/**
 * Reserved variable name pattern (uppercase with underscores)
 */
export const RESERVED_VARIABLE_PATTERN = /^[A-Z_]+$/;

/**
 * Error types for the templating server
 */
export enum TemplatingErrorType {
  TEMPLATE_DIR_NOT_FOUND = 'TEMPLATE_DIR_NOT_FOUND',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TARGET_EXISTS = 'TARGET_EXISTS',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  RENDER_ERROR = 'RENDER_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

/**
 * Error class for templating operations
 */
export class TemplatingError extends Error {
  constructor(
    public type: TemplatingErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'TemplatingError';
  }
}

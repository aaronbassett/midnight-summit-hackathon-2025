#!/usr/bin/env node

/**
 * Templating MCP Server
 * Provides template scaffolding tools for pod network development
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { initializeLogger, getTemplatingLogger } from './logger.js';
import { discoverTemplates, getTemplateDetails } from './template-loader.js';
import { renderTemplate } from './template-renderer.js';
import { templateDetailsRequestSchema, renderRequestSchema } from './validation.js';
import { TemplatingError, TemplatingErrorType } from './types.js';

let logger: ReturnType<typeof getTemplatingLogger>;

/**
 * MCP Server instance
 */
const server = new Server(
  {
    name: 'pod-templating',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * Handle list_tools request
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_templates',
        description: 'List all available templates for scaffolding projects and smart contracts',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: 'get_template_details',
        description:
          'Get detailed information about a template including metadata, variables, and structure',
        inputSchema: {
          type: 'object',
          properties: {
            templateName: {
              type: 'string',
              description: 'Name of the template to get details for'
            }
          },
          required: ['templateName'],
          additionalProperties: false
        }
      },
      {
        name: 'render_template',
        description: 'Render a template to a target location with variable substitution',
        inputSchema: {
          type: 'object',
          properties: {
            templateName: {
              type: 'string',
              description: 'Name of the template to render'
            },
            targetPath: {
              type: 'string',
              description: 'Target directory path for rendered output'
            },
            variables: {
              type: 'object',
              description: 'Variable values for template substitution',
              additionalProperties: { type: 'string' }
            }
          },
          required: ['templateName', 'targetPath', 'variables'],
          additionalProperties: false
        }
      }
    ]
  };
});

/**
 * Handle call_tool request
 */
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params as {
    name: string;
    arguments: Record<string, unknown>;
  };

  logger.info('Tool call received', { tool: name });

  try {
    switch (name) {
      case 'list_templates': {
        logger.debug('Executing list_templates');
        const templates = await discoverTemplates();

        logger.info('list_templates completed', {
          totalCount: templates.length,
          withErrors: templates.filter(t => t.hasError).length
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  templates,
                  totalCount: templates.length
                },
                null,
                2
              )
            }
          ]
        };
      }

      case 'get_template_details': {
        logger.debug('Executing get_template_details', { args });

        // Validate request
        const validatedArgs = templateDetailsRequestSchema.parse(args);
        const details = await getTemplateDetails(validatedArgs.templateName);

        logger.info('get_template_details completed', {
          templateName: validatedArgs.templateName
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2)
            }
          ]
        };
      }

      case 'render_template': {
        logger.debug('Executing render_template', { args });

        // Validate request
        const validatedArgs = renderRequestSchema.parse(args);
        const result = await renderTemplate(validatedArgs);

        logger.info('render_template completed', {
          templateName: validatedArgs.templateName,
          targetPath: result.targetPath,
          filesCreated: result.filesCreated,
          directoriesCreated: result.directoriesCreated
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new TemplatingError(TemplatingErrorType.SERVER_ERROR, `Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error('Tool execution failed', {
      tool: name,
      error: error instanceof Error ? error.message : String(error)
    });

    // Handle different error types
    if (error instanceof TemplatingError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error.type,
                message: error.message,
                details: error.details
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }

    // Handle validation errors
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: TemplatingErrorType.VALIDATION_ERROR,
                message: error.message
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }

    // Generic error
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: TemplatingErrorType.SERVER_ERROR,
              message: error instanceof Error ? error.message : String(error)
            },
            null,
            2
          )
        }
      ],
      isError: true
    };
  }
});

/**
 * Start the server
 */
async function main() {
  // Initialize logging FIRST, before getting logger instance
  await initializeLogger();
  logger = getTemplatingLogger();

  logger.info('Starting pod-templating MCP server');

  // Create transport
  const transport = new StdioServerTransport();

  // Connect server to transport
  await server.connect(transport);

  logger.info('pod-templating MCP server started successfully');

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    await server.close();
    process.exit(0);
  });
}

main().catch(error => {
  logger.error('Fatal error starting server', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});

/**
 * CLI argument parsing utilities
 */

/**
 * Parsed CLI arguments
 */
export interface CliArgs {
  config?: string;
  port?: number;
}

/**
 * Parse CLI arguments from process.argv
 *
 * @param args - Array of command-line arguments (defaults to process.argv.slice(2))
 * @returns Parsed arguments object
 */
export function parseArgs(args: string[] = process.argv.slice(2)): CliArgs {
  const result: CliArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && i + 1 < args.length) {
      result.config = args[++i];
    } else if (args[i] === '--port' && i + 1 < args.length) {
      result.port = parseInt(args[++i], 10);
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return result;
}

/**
 * Print CLI help message
 */
export function printHelp(): void {
  console.log(`
rigging-mcp - Universal cross-platform MCP server

Usage: rigging-mcp [OPTIONS]

Options:
  --config PATH   Path to rigging.json config file (default: ./rigging.json)
  --port NUMBER   Port to listen on (overrides config file)
  --help, -h      Show this help message

Config File Format:
  {
    "sources": [
      {
        "namespace": "pod",
        "description": "pod network skills and agents",
        "skills": "../midnight-plugin/skills",
        "agents": "../midnight-plugin/agents"
      }
    ],
    "server": {
      "port": 3000,
      "host": "localhost"
    }
  }

Examples:
  rigging-mcp
  rigging-mcp --config ./custom-config.json
  rigging-mcp --port 8080
`);
}

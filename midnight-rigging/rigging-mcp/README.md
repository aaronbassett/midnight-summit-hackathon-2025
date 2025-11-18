# rigging-mcp

Universal cross-platform MCP server for exposing rigging-compatible skills and agents via HTTP.

## Overview

`rigging-mcp` is an HTTP server that makes pod network skills and agents accessible to any AI coding assistant platform that cannot use the Claude Code plugin directly (Cursor, OpenAI orchestrators, Gemini, etc.). It reads from configured plugin directories and serves content via REST endpoints with namespace isolation and multi-source support.

## Features

- **Universal HTTP Access**: Expose skills and agents via simple REST endpoints
- **Multi-Source Support**: Aggregate content from multiple plugin ecosystems with namespace isolation
- **Discovery Endpoint**: Single endpoint to list all available resources
- **Template Substitution**: Dynamic agent prompts with query parameter substitution
- **Docker & npm Support**: Deploy via container or global npm package
- **Zero Configuration**: Works with sensible defaults, customizable via config file

## Installation

### Option 1: npm (Node.js Required)

```bash
# Clone repository
git clone https://github.com/aaronbassett/pod-rigging.git
cd pod-rigging/rigging-mcp

# Install dependencies
npm install

# Build
npm run build

# Run server
npm start
```

### Option 2: Docker (No Node.js Required)

```bash
# Build image
docker build -t rigging-mcp -f rigging-mcp/Dockerfile .

# Run container
docker run -d \
  -v $(pwd)/midnight-plugin/skills:/app/midnight-plugin/skills \
  -v $(pwd)/midnight-plugin/agents:/app/midnight-plugin/agents \
  -v $(pwd)/rigging.json:/app/rigging.json \
  -p 3000:3000 \
  rigging-mcp
```

## Configuration

Create a `rigging.json` file in your working directory:

```json
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
```

### Multi-Source Example

```json
{
  "sources": [
    {
      "namespace": "pod",
      "description": "pod network official content",
      "skills": "/path/to/midnight-plugin/skills",
      "agents": "/path/to/midnight-plugin/agents"
    },
    {
      "namespace": "custom",
      "description": "Custom internal skills",
      "skills": "/path/to/custom/skills",
      "agents": "/path/to/custom/agents"
    }
  ],
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  }
}
```

## CLI Usage

```bash
# Use default config (./rigging.json or ./rigging.json.example)
rigging-mcp

# Specify custom config file
rigging-mcp --config /path/to/custom-config.json

# Override port from config
rigging-mcp --port 8080

# Show help
rigging-mcp --help
```

## API Endpoints

### Discovery

```bash
GET /discovery
```

Returns all available resources with namespace-prefixed URIs.

**Response:**

```json
{
  "prompts": ["mcp://rigging/pod/prompts/agent-name"],
  "resources": ["mcp://rigging/pod/resources/skill-name"],
  "references": ["mcp://rigging/pod/references/skill-name/ref-name"]
}
```

### Agent Prompts

```bash
# Get full agent content
GET /prompts/{namespace}/{name}

# Get agent metadata (frontmatter only)
GET /prompts/{namespace}/{name}/metadata

# Get agent with template substitution
GET /prompts/{namespace}/{name}?task=testing&framework=foundry
```

### Skills

```bash
# Get full skill content
GET /resources/{namespace}/{name}

# Get skill metadata (frontmatter + parameters schema)
GET /resources/{namespace}/{name}/metadata
```

### References

```bash
# Get reference document
GET /references/{namespace}/{skillName}/{referenceName}
```

## Integration Examples

### Python (OpenAI SDK)

```python
import requests
import openai

# Discover agents
discovery = requests.get("http://localhost:3000/discovery").json()

# Get agent prompt
agent_prompt = requests.get(
    "http://localhost:3000/prompts/pod/midnight-developer",
    params={"task": "testing"}
).text

# Use with OpenAI
client = openai.OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": agent_prompt},
        {"role": "user", "content": "Write a test for ERC20"}
    ]
)
```

### TypeScript (VS Code Extension)

```typescript
import axios from 'axios';

// Discover all skills
const discovery = await axios.get('http://localhost:3000/discovery');

for (const skillUri of discovery.data.resources) {
  const [, , namespace, , skillName] = skillUri.split('/');

  // Get skill metadata
  const metadata = await axios.get(
    `http://localhost:3000/resources/${namespace}/${skillName}/metadata`
  );

  // Register as command
  vscode.commands.registerCommand(`pod.${skillName}`, async () => {
    // Implementation
  });
}
```

## Performance

- **Discovery endpoint**: <100ms (cached at startup)
- **Metadata endpoints**: <500ms (in-memory lookups)
- **Template substitution**: <50ms (regex-based)

## Limitations

- **File Size**: Individual skill/agent files (SKILL.md, AGENT.md, references) must be ≤100MB. This limit prevents DoS attacks from maliciously large files while accommodating documentation-heavy skills.
- **Request Timeout**: No default timeout configured. For production deployments, configure a reverse proxy with appropriate timeout settings.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Type check
npm run type-check

# Format code
npm run format

# Run tests
npm test
```

## Project Structure

```
rigging-mcp/
├── src/
│   ├── index.ts              # HTTP server entry point
│   ├── config.ts             # Config file loader
│   ├── indexer.ts            # In-memory index builder
│   ├── discovery.ts          # Discovery endpoint
│   ├── prompts.ts            # Agent prompts endpoints
│   ├── resources.ts          # Skills resources endpoints
│   ├── references.ts         # Reference documents endpoint
│   ├── frontmatter.ts        # YAML frontmatter parser
│   ├── templates.ts          # Template substitution
│   ├── loaders/
│   │   ├── agents.ts         # Agent loader
│   │   └── skills.ts         # Skills loader
│   └── utils/
│       ├── errors.ts         # Error handling
│       ├── logger.ts         # LogTape configuration
│       ├── schemas.ts        # Zod validation schemas
│       └── validation.ts     # Directory validation
├── tests/
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test data
├── dist/                     # Compiled JavaScript
├── Dockerfile                # Container build
├── rigging.json.example      # Example configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Error Handling

All errors return JSON with the format:

```json
{
  "error": "ERROR_TYPE",
  "message": "Human-readable message",
  "details": {}
}
```

Error types:

- `NOT_FOUND`: Resource doesn't exist (404)
- `INVALID_YAML`: Frontmatter parsing failed (500)
- `INVALID_JSON`: Config parsing failed (500)
- `FS_ERROR`: File system error (500)
- `INVALID_CONFIG`: Configuration validation failed (500)
- `DUPLICATE_NAMESPACE`: Namespace collision (500)

## License

MIT

## Contributing

See the repository root README for contribution guidelines.

## Support

- **Issues**: https://github.com/aaronbassett/pod-rigging/issues
- **Documentation**: Repository README
- **Community**: pod network Discord

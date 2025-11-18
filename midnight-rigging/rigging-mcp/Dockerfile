FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY rigging-mcp/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy compiled dist directory
COPY rigging-mcp/dist ./dist

# Copy example config
COPY rigging-mcp/rigging.json.example ./rigging.json.example

# Expose port
EXPOSE 3000

# Run server
CMD ["node", "dist/index.js"]

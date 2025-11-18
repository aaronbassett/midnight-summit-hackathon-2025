#!/usr/bin/env node

/**
 * Test script for RAG MCP server connection
 */

const RAG_SERVER_URL = 'https://midnight-rag-mcp.fly.dev';

async function testListCollections() {
  console.log('Testing list_collections...\n');

  try {
    const response = await fetch(`${RAG_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'list_collections',
          arguments: {}
        }
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/event-stream')) {
      console.log('\nReceived SSE stream:');
      const text = await response.text();
      console.log(text);
    } else {
      console.log('\nReceived JSON:');
      const json = await response.json();
      console.log(JSON.stringify(json, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testQueryCollection() {
  console.log('\n\nTesting collection_query...\n');

  try {
    const response = await fetch(`${RAG_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'collection_query',
          arguments: {
            collection: 'midnight-docs-v1',
            queryTexts: ['What is Compact?'],
            nResults: 3,
            include: ['documents', 'metadatas', 'distances']
          }
        }
      })
    });

    console.log('Response status:', response.status);

    const contentType = response.headers.get('content-type');

    if (contentType?.includes('text/event-stream')) {
      console.log('\nReceived SSE stream:');
      const text = await response.text();
      console.log(text);
    } else {
      console.log('\nReceived JSON:');
      const json = await response.json();
      console.log(JSON.stringify(json, null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
(async () => {
  await testListCollections();
  await testQueryCollection();
})();

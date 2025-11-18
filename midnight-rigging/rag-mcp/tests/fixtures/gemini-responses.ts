/**
 * Test fixtures for Gemini API responses
 * Used for mocking AI-generated collection descriptions and recommendations
 */

import type { CollectionDescription, CollectionRecommendation } from '../../src/types/index.js';

/**
 * Valid describe_collection response for a non-empty collection
 */
export const validDescribeResponse: Omit<CollectionDescription, 'generatedAt' | 'cachedUntil'> = {
  collectionName: 'midnight-network-docs',
  summary:
    'Official pod network documentation including smart contract guides, API references, and developer tutorials. Content covers contract deployment, network interactions, and best practices.',
  dataCharacteristics: [
    'Technical documentation and guides',
    'Code examples in pod network smart contract language',
    'API reference documentation',
    'Deployment and configuration instructions'
  ],
  recommendedUseCases: [
    'Learning how to write pod network smart contracts',
    'Finding API endpoints and usage examples',
    'Troubleshooting deployment issues',
    'Understanding pod network architecture'
  ],
  exampleQueries: [
    'How do I deploy a contract to pod network?',
    'What are the available API endpoints?',
    'How do I interact with deployed contracts?'
  ],
  documentCount: 1247,
  metadata: {
    createdAt: '2024-01-15T00:00:00Z',
    lastUpdated: '2025-11-01T12:30:00Z'
  },
  isEmpty: false
};

/**
 * Valid describe_collection response for an empty collection
 */
export const validEmptyDescribeResponse: Omit<
  CollectionDescription,
  'generatedAt' | 'cachedUntil'
> = {
  collectionName: 'new-collection',
  summary: 'This collection exists but contains no documents yet.',
  dataCharacteristics: [],
  recommendedUseCases: [],
  exampleQueries: [],
  documentCount: 0,
  metadata: {
    createdAt: '2025-11-13T09:00:00Z'
  },
  isEmpty: true
};

/**
 * Invalid describe_collection response (missing required fields)
 */
export const invalidDescribeResponse = {
  collectionName: 'invalid-collection',
  summary: 'Invalid response',
  // Missing dataCharacteristics, recommendedUseCases, exampleQueries
  documentCount: 100,
  isEmpty: false
};

/**
 * Invalid describe_collection response (wrong array lengths for non-empty collection)
 */
export const invalidArrayLengthsResponse = {
  collectionName: 'test-collection',
  summary: 'Test collection',
  dataCharacteristics: ['Only one characteristic'], // Should have 3-5
  recommendedUseCases: ['Only one use case'], // Should have 3-5
  exampleQueries: ['Only one query'], // Should have 3-5
  documentCount: 100,
  metadata: {},
  isEmpty: false
};

/**
 * Valid recommend_collection response with 3 recommendations
 */
export const validRecommendResponse: Omit<CollectionRecommendation, 'generatedAt' | 'cachedUntil'> =
  {
    query: 'How do I deploy a smart contract?',
    recommendations: [
      {
        collectionName: 'midnight-network-docs',
        suitabilityScore: 95,
        explanation:
          'Contains comprehensive deployment guides and contract examples for pod network.',
        rank: 1
      },
      {
        collectionName: 'smart-contract-tutorials',
        suitabilityScore: 82,
        explanation: 'Provides step-by-step tutorials for contract development and deployment.',
        rank: 2
      },
      {
        collectionName: 'cli-documentation',
        suitabilityScore: 68,
        explanation: 'Includes CLI commands for contract compilation and deployment workflows.',
        rank: 3
      }
    ]
  };

/**
 * Valid recommend_collection response with fewer than 3 collections
 */
export const validRecommendFewerResponse: Omit<
  CollectionRecommendation,
  'generatedAt' | 'cachedUntil'
> = {
  query: 'network architecture',
  recommendations: [
    {
      collectionName: 'midnight-network-docs',
      suitabilityScore: 88,
      explanation: 'Contains detailed architecture diagrams and network design documentation.',
      rank: 1
    }
  ]
};

/**
 * Invalid recommend_collection response (ranks not sequential)
 */
export const invalidRanksResponse = {
  query: 'test query',
  recommendations: [
    {
      collectionName: 'collection1',
      suitabilityScore: 90,
      explanation: 'Test explanation',
      rank: 1
    },
    {
      collectionName: 'collection2',
      suitabilityScore: 80,
      explanation: 'Test explanation',
      rank: 3 // Should be 2
    }
  ]
};

/**
 * Invalid recommend_collection response (not sorted by score)
 */
export const invalidSortingResponse = {
  query: 'test query',
  recommendations: [
    {
      collectionName: 'collection1',
      suitabilityScore: 70,
      explanation: 'Test explanation',
      rank: 1
    },
    {
      collectionName: 'collection2',
      suitabilityScore: 90, // Should be lower than previous
      explanation: 'Test explanation',
      rank: 2
    }
  ]
};

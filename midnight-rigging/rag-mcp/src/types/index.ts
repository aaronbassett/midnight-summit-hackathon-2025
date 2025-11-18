/**
 * Shared types for the RAG MCP server
 */

import { z } from 'zod';

// ============================================================================
// Gemini API Response Types
// ============================================================================

export interface CollectionDescription {
  collectionName: string;
  summary: string;
  dataCharacteristics: string[];
  recommendedUseCases: string[];
  exampleQueries: string[];
  documentCount: number;
  metadata?: Record<string, unknown> | null;
  isEmpty: boolean;
  generatedAt: string; // ISO 8601
  cachedUntil: string; // ISO 8601
}

export interface RecommendationItem {
  collectionName: string;
  suitabilityScore: number; // 0-100
  explanation: string;
  rank: number; // 1, 2, or 3
}

export interface CollectionRecommendation {
  query: string;
  recommendations: RecommendationItem[];
  generatedAt: string; // ISO 8601
  cachedUntil: string; // ISO 8601
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const CollectionDescriptionSchema = z
  .object({
    collectionName: z.string().min(1),
    summary: z.string().min(1).max(500),
    dataCharacteristics: z.array(z.string().max(200)).min(0).max(5),
    recommendedUseCases: z.array(z.string().max(200)).min(0).max(5),
    exampleQueries: z.array(z.string().max(150)).min(0).max(5),
    documentCount: z.number().int().min(0),
    metadata: z.record(z.unknown()).nullable().optional(),
    isEmpty: z.boolean(),
    generatedAt: z.string().datetime(),
    cachedUntil: z.string().datetime()
  })
  .refine(
    data => {
      if (data.isEmpty) {
        return (
          data.dataCharacteristics.length === 0 &&
          data.recommendedUseCases.length === 0 &&
          data.exampleQueries.length === 0
        );
      }
      return (
        data.dataCharacteristics.length >= 3 &&
        data.recommendedUseCases.length >= 3 &&
        data.exampleQueries.length >= 3
      );
    },
    { message: 'Empty collections must have empty arrays; non-empty must have 3-5 items' }
  );

const RecommendationItemSchema = z.object({
  collectionName: z.string().min(1),
  suitabilityScore: z.number().int().min(0).max(100),
  explanation: z.string().min(1).max(300),
  rank: z.number().int().min(1).max(3)
});

export const CollectionRecommendationSchema = z
  .object({
    query: z.string().min(1),
    recommendations: z.array(RecommendationItemSchema).min(1).max(3),
    generatedAt: z.string().datetime(),
    cachedUntil: z.string().datetime()
  })
  .refine(
    data => {
      // Verify ranks are sequential 1, 2, 3
      const ranks = data.recommendations.map(r => r.rank).sort();
      const expectedRanks = data.recommendations.map((_, i) => i + 1);
      return JSON.stringify(ranks) === JSON.stringify(expectedRanks);
    },
    { message: 'Ranks must be sequential 1, 2, 3' }
  )
  .refine(
    data => {
      // Verify items are ordered by score descending
      for (let i = 1; i < data.recommendations.length; i++) {
        if (
          data.recommendations[i].suitabilityScore >= data.recommendations[i - 1].suitabilityScore
        ) {
          return false;
        }
      }
      return true;
    },
    { message: 'Recommendations must be ordered by suitability score descending' }
  );

// ============================================================================
// ChromaDB Types
// ============================================================================

export interface ChromaQueryParams {
  queryTexts: string[];
  nResults?: number;
  where?: Record<string, unknown>;
  whereDocument?: Record<string, unknown>;
  include?: ('documents' | 'embeddings' | 'metadatas' | 'distances')[];
}

export interface ChromaGetParams {
  ids?: string[];
  where?: Record<string, unknown>;
  whereDocument?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  include?: ('documents' | 'embeddings' | 'metadatas' | 'distances')[];
}

export interface ChromaQueryResult {
  ids: string[][];
  embeddings: number[][][] | null;
  documents: (string | null)[][];
  metadatas: (Record<string, unknown> | null)[][];
  distances: number[][] | null;
}

export interface ChromaGetResult {
  ids: string[];
  embeddings: number[][] | null;
  documents: (string | null)[];
  metadatas: (Record<string, unknown> | null)[];
}

export interface CollectionInfo {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

export interface SecurityConfig {
  maxQueryLength: number;
  maxResultsPerQuery: number;
  maxIdsPerRequest: number;
}

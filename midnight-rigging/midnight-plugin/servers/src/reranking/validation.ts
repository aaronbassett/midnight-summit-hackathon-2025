/**
 * Input validation schemas using Zod
 * Based on specs/002-reranking-mcp-server/data-model.md
 */

import { z } from 'zod';

export const ChunkSchema = z.object({
  text: z.string().min(1, 'Chunk text cannot be empty'),
  metadata: z.record(z.unknown()).optional(),
  id: z.string().optional()
});

export const RerankRequestSchema = z.object({
  query: z
    .string()
    .min(1, 'Query cannot be empty')
    .max(1000, 'Query exceeds maximum length of 1000 characters'),
  chunks: z
    .array(ChunkSchema)
    .min(1, 'At least one chunk is required')
    .max(50, 'Maximum 50 chunks allowed'),
  limit: z.number().int().min(1).max(50).optional(),
  model: z
    .enum(['Xenova/ms-marco-MiniLM-L-6-v2', 'Xenova/bge-reranker-base'])
    .optional()
    .default('Xenova/ms-marco-MiniLM-L-6-v2')
});

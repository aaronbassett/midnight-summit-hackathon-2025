/**
 * Gemini API Client Service
 *
 * Handles AI-powered collection descriptions and recommendations using Google Gemini API.
 * Implements timeout, retry logic, and response validation.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getLogger } from '@logtape/logtape';
import {
  CollectionDescription,
  CollectionRecommendation,
  CollectionDescriptionSchema,
  CollectionRecommendationSchema
} from '../types/index.js';

const logger = getLogger(['rag-mcp', 'gemini-client']);

/**
 * Prompt template for describing a collection
 */
const DESCRIBE_PROMPT = (params: {
  collectionName: string;
  documentCount: number;
  peek: unknown[];
  metadata: Record<string, unknown>;
}): string => `You are analyzing a vector database collection. Based on the sample documents and metadata provided, generate a structured description.

Collection: ${params.collectionName}
Document Count: ${params.documentCount}
Sample Documents: ${JSON.stringify(params.peek, null, 2)}
Metadata: ${JSON.stringify(params.metadata, null, 2)}

Respond with ONLY valid JSON matching this schema:
{
  "summary": "2-3 sentence overview of collection contents",
  "dataCharacteristics": ["characteristic1", "characteristic2", "characteristic3", "characteristic4", "characteristic5"],
  "recommendedUseCases": ["use case 1", "use case 2", "use case 3", "use case 4", "use case 5"],
  "exampleQueries": ["query 1", "query 2", "query 3", "query 4", "query 5"]
}

Requirements:
- summary: Concise, factual description of what the collection contains (2-3 sentences, <500 chars)
- dataCharacteristics: Exactly 3-5 bullet points about data types, themes, or patterns (each <200 chars)
- recommendedUseCases: Exactly 3-5 scenarios when this collection should be queried (each <200 chars)
- exampleQueries: Exactly 3-5 example questions this collection could answer (each <150 chars)

Return ONLY the JSON object. No markdown, no explanations, no additional text.`;

/**
 * Prompt template for ranking collections by query suitability
 */
const RECOMMEND_PROMPT = (params: {
  query: string;
  collectionDescriptions: Array<{
    name: string;
    summary: string;
    recommendedUseCases: string[];
  }>;
}): string => `You are ranking vector database collections by suitability for a query.

Query: ${params.query}

Available Collections:
${params.collectionDescriptions
  .map(
    (c, idx) =>
      `${idx + 1}. ${c.name}
   Summary: ${c.summary}
   Use Cases: ${c.recommendedUseCases.join(', ')}`
  )
  .join('\n\n')}

Rank the top 3 most suitable collections for this query. Respond with ONLY valid JSON:
{
  "recommendations": [
    {
      "collectionName": "name",
      "suitabilityScore": 0-100,
      "explanation": "why this collection is suitable (1-2 sentences)"
    }
  ]
}

Return exactly 3 recommendations (or fewer if less than 3 collections available), ordered by suitability (highest first).
Each suitabilityScore must be unique (no ties).
Each explanation must be 1-2 sentences (<300 chars).
Return ONLY the JSON object. No markdown, no explanations, no additional text.`;

export class GeminiClientService {
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  private readonly modelName = 'gemini-1.5-flash';
  private readonly timeout = 10000; // 10 seconds
  private readonly maxRetries = 1; // Single retry
  private readonly retryDelay = 2000; // 2 seconds

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable required');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = this.client.getGenerativeModel({ model: this.modelName });

    logger.info('Gemini client initialized', { model: this.modelName });
  }

  /**
   * Generate AI-powered description of a collection
   */
  async describeCollection(params: {
    collectionName: string;
    peek: unknown[];
    metadata: Record<string, unknown>;
    documentCount: number;
  }): Promise<CollectionDescription> {
    const prompt = DESCRIBE_PROMPT(params);

    logger.info('Generating collection description', {
      collection: params.collectionName,
      documentCount: params.documentCount
    });

    try {
      const response = await this.callWithRetry(prompt);

      // Build full CollectionDescription object
      const generatedAt = new Date().toISOString();
      const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const description: CollectionDescription = {
        collectionName: params.collectionName,
        summary: response.summary,
        dataCharacteristics: response.dataCharacteristics || [],
        recommendedUseCases: response.recommendedUseCases || [],
        exampleQueries: response.exampleQueries || [],
        documentCount: params.documentCount,
        metadata: params.metadata,
        isEmpty: false,
        generatedAt,
        cachedUntil
      };

      // Validate response against schema
      const validated = CollectionDescriptionSchema.parse(description);

      logger.info('Collection description generated successfully', {
        collection: params.collectionName
      });

      return validated;
    } catch (error) {
      logger.error('Failed to generate collection description', {
        collection: params.collectionName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Generate AI-powered collection recommendations for a query
   */
  async recommendCollections(params: {
    query: string;
    collectionDescriptions: Array<{
      name: string;
      summary: string;
      recommendedUseCases: string[];
    }>;
  }): Promise<CollectionRecommendation> {
    const prompt = RECOMMEND_PROMPT(params);

    logger.info('Generating collection recommendations', {
      query: params.query,
      collectionCount: params.collectionDescriptions.length
    });

    try {
      const response = await this.callWithRetry(prompt);

      // Build full CollectionRecommendation object
      const generatedAt = new Date().toISOString();
      const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const recommendation: CollectionRecommendation = {
        query: params.query,
        recommendations: response.recommendations || [],
        generatedAt,
        cachedUntil
      };

      // Validate response against schema
      const validated = CollectionRecommendationSchema.parse(recommendation);

      logger.info('Collection recommendations generated successfully', {
        query: params.query,
        count: validated.recommendations.length
      });

      return validated;
    } catch (error) {
      logger.error('Failed to generate collection recommendations', {
        query: params.query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Call Gemini API with timeout and retry logic
   */
  private async callWithRetry(prompt: string): Promise<any> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Use Promise.race to enforce timeout
        // (Google Generative AI SDK doesn't support AbortSignal)
        const apiCall = this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const timeoutPromise = new Promise<never>((_resolve, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        );

        const result = await Promise.race([apiCall, timeoutPromise]);

        const text = result.response.text();

        // Parse JSON response
        let parsed: any;
        try {
          // Remove markdown code blocks if present
          const cleanedText = text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          parsed = JSON.parse(cleanedText);
        } catch (parseError) {
          logger.warn('Failed to parse Gemini response as JSON', {
            attempt,
            response: text.substring(0, 200)
          });
          throw new Error('Invalid JSON response from Gemini API');
        }

        return parsed;
      } catch (error) {
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        const isServerError =
          error instanceof Error &&
          'status' in error &&
          typeof error.status === 'number' &&
          error.status >= 500;
        const shouldRetry = (isTimeout || isServerError) && attempt < this.maxRetries;

        if (shouldRetry) {
          logger.warn('Gemini API call failed, retrying...', {
            attempt,
            error: error instanceof Error ? error.message : String(error)
          });
          await this.sleep(this.retryDelay);
          continue;
        }

        // If we shouldn't retry or have exhausted retries, throw the error
        throw error;
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new Error('Gemini API call failed after retries');
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

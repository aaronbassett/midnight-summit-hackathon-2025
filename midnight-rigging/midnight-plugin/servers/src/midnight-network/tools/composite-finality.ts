/**
 * Finality Analysis Composite Tools
 * FR-058: verify_finality - Transaction finality verification
 * FR-060: analyze_past_perfect_time - Past Perfect Time analysis
 */

import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('composite-finality');
const rpcClient = new RpcClient();

export interface FinalityStatus {
  transactionHash: string;
  finalized: boolean;
  attestationCount: number;
  requiredAttestations: number;
  attestationPercentage: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  timeToFinality?: number;
  receiptTimestamp?: string;
  pastPerfectTime?: number;
  errors: string[];
  warnings: string[];
}

export interface PastPerfectTimeAnalysis {
  pastPerfectTime: number;
  pastPerfectTimeFormatted: string;
  currentTime: number;
  lagSeconds: number;
  receiptsAroundPPT: any[];
  receiptCount: number;
  advancementRate?: number;
  errors: string[];
  warnings: string[];
}

/**
 * verify_finality - Verify transaction finality status
 *
 * Combines:
 * - eth_getTransactionReceipt (extract attestations)
 * - pod_getCommittee (calculate 2/3 threshold)
 * - pod_pastPerfectTime (check if past PPT)
 *
 * Implements partial success reporting (FR research finding #7)
 */
export async function verify_finality(params: [{ txHash: string }]): Promise<any> {
  try {
    const [{ txHash }] = params;

    logger.info('verify_finality_start', { txHash });

    const status: FinalityStatus = {
      transactionHash: txHash,
      finalized: false,
      attestationCount: 0,
      requiredAttestations: 0,
      attestationPercentage: 0,
      confidence: 'NONE',
      errors: [],
      warnings: []
    };

    // Fetch transaction receipt and committee in parallel
    const [receiptResult, committeeResult, pptResult] = await Promise.allSettled([
      rpcClient.call('eth_getTransactionReceipt', [txHash]),
      rpcClient.call('pod_getCommittee', []),
      rpcClient.call('pod_pastPerfectTime', []).catch(() => {
        // pod_pastPerfectTime may not be implemented yet
        return null;
      })
    ]);

    // Process receipt
    if (receiptResult.status === 'fulfilled' && receiptResult.value) {
      const receipt = receiptResult.value;

      // Extract attestation count from pod_metadata
      if (receipt.pod_metadata && receipt.pod_metadata.attestations) {
        status.attestationCount = receipt.pod_metadata.attestations;
      }

      // Extract receipt timestamp
      if (receipt.pod_metadata && receipt.pod_metadata.timestamp) {
        status.receiptTimestamp = receipt.pod_metadata.timestamp;
      }
    } else {
      status.errors.push('Failed to fetch transaction receipt');
    }

    // Process committee
    if (committeeResult.status === 'fulfilled' && committeeResult.value) {
      const committee = committeeResult.value;

      // Calculate 2/3 threshold
      if (committee.quorum_size) {
        status.requiredAttestations = committee.quorum_size;
      } else if (committee.replicas && Array.isArray(committee.replicas)) {
        // Calculate 2/3 of committee size
        status.requiredAttestations = Math.ceil((committee.replicas.length * 2) / 3);
      }
    } else {
      status.warnings.push('Could not fetch committee information');
      // Assume common quorum of 3 for 5-node committee
      status.requiredAttestations = 3;
    }

    // Calculate attestation percentage and confidence
    if (status.requiredAttestations > 0) {
      status.attestationPercentage = (status.attestationCount / status.requiredAttestations) * 100;

      if (status.attestationCount >= status.requiredAttestations) {
        status.finalized = true;
        status.confidence = 'HIGH';
      } else if (status.attestationPercentage >= 50) {
        status.confidence = 'MEDIUM';
      } else if (status.attestationPercentage > 0) {
        status.confidence = 'LOW';
      }
    }

    // Process Past Perfect Time
    if (pptResult.status === 'fulfilled' && pptResult.value) {
      status.pastPerfectTime = pptResult.value;

      // Check if transaction is before PPT (confirmed finality)
      if (status.receiptTimestamp && status.pastPerfectTime) {
        const receiptTime = new Date(status.receiptTimestamp).getTime() * 1000; // Convert to microseconds
        if (receiptTime <= status.pastPerfectTime) {
          status.finalized = true;
          status.confidence = 'HIGH';
        }
      }
    }

    // Calculate time to finality
    if (status.finalized && status.receiptTimestamp) {
      const receiptTime = new Date(status.receiptTimestamp).getTime();
      const currentTime = Date.now();
      status.timeToFinality = (currentTime - receiptTime) / 1000; // In seconds
    }

    // Cache the finality status (5 minute TTL)
    const cacheKey = `verify_finality:${txHash}`;
    cache.set('transactions', cacheKey, status);

    logger.info('verify_finality_complete', {
      txHash,
      finalized: status.finalized,
      confidence: status.confidence,
      attestations: `${status.attestationCount}/${status.requiredAttestations}`,
      errorCount: status.errors.length
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result: status }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(
      'verify_finality_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * analyze_past_perfect_time - Explain Past Perfect Time semantics
 *
 * Combines:
 * - pod_pastPerfectTime (get PPT timestamp)
 * - pod_listReceipts (receipts around PPT)
 *
 * Implements partial success reporting (FR research finding #7)
 */
export async function analyze_past_perfect_time(
  params: [{ windowSeconds?: number }]
): Promise<any> {
  try {
    const [{ windowSeconds = 60 }] = params || [{}];

    logger.info('analyze_past_perfect_time_start', { windowSeconds });

    const analysis: PastPerfectTimeAnalysis = {
      pastPerfectTime: 0,
      pastPerfectTimeFormatted: '',
      currentTime: Date.now() * 1000, // Convert to microseconds
      lagSeconds: 0,
      receiptsAroundPPT: [],
      receiptCount: 0,
      errors: [],
      warnings: []
    };

    // Fetch Past Perfect Time
    try {
      const pptResult = await rpcClient.call('pod_pastPerfectTime', []);
      analysis.pastPerfectTime = pptResult;

      // Convert microseconds to readable format
      const pptDate = new Date(pptResult / 1000); // Convert to milliseconds
      analysis.pastPerfectTimeFormatted = pptDate.toISOString();

      // Calculate lag behind current time
      analysis.lagSeconds = (analysis.currentTime - analysis.pastPerfectTime) / 1000000; // Convert to seconds
    } catch (error) {
      analysis.errors.push(
        'Failed to fetch Past Perfect Time (pod_pastPerfectTime may not be implemented)'
      );
      logger.error('ppt_fetch_failed', error instanceof Error ? error : new Error(String(error)));
    }

    // Fetch receipts around PPT
    if (analysis.pastPerfectTime > 0) {
      try {
        // Calculate window start time (PPT - windowSeconds)
        const windowStart = analysis.pastPerfectTime - windowSeconds * 1000000;

        const receiptsResult = await rpcClient.call('pod_listReceipts', [
          {
            since: windowStart
          }
        ]);

        if (receiptsResult && Array.isArray(receiptsResult)) {
          analysis.receiptsAroundPPT = receiptsResult;
          analysis.receiptCount = receiptsResult.length;

          // Calculate advancement rate (receipts per second)
          if (analysis.receiptCount > 0 && windowSeconds > 0) {
            analysis.advancementRate = analysis.receiptCount / windowSeconds;
          }
        }
      } catch (error) {
        analysis.warnings.push('Could not fetch receipts around PPT');
        const err = error instanceof Error ? error : new Error(String(error));
        logger.warning('ppt_receipts_fetch_failed', { error: err.message });
      }
    }

    // Cache the PPT analysis (5 second TTL for network stats)
    const cacheKey = `analyze_past_perfect_time:${windowSeconds}`;
    cache.set('networkStats', cacheKey, analysis);

    logger.info('analyze_past_perfect_time_complete', {
      ppt: analysis.pastPerfectTimeFormatted,
      lagSeconds: analysis.lagSeconds,
      receiptCount: analysis.receiptCount,
      errorCount: analysis.errors.length
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result: analysis }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(
      'analyze_past_perfect_time_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

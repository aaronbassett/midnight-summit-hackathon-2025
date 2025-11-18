/**
 * Performance Analysis Composite Tools
 * FR-055: analyze_pod_performance - Network performance metrics
 * FR-057: track_attestation_performance - Attestation statistics
 * FR-059: benchmark_transaction_speed - Transaction speed benchmarks
 */

import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('composite-performance');
const rpcClient = new RpcClient();

export interface PodPerformanceMetrics {
  timeWindow: {
    startTime: string;
    endTime: string;
    durationSeconds: number;
  };
  throughput: {
    receiptsPerSecond: number;
    totalReceipts: number;
    trend: string;
  };
  finality: {
    averageAttestations: number;
    averageTimeToTwoThirds: number;
    percentFinalized: number;
  };
  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  validators: {
    committeeSize: number;
    quorumSize: number;
  };
  errors: string[];
  warnings: string[];
}

export interface AttestationPerformance {
  timeWindow: {
    startTime: string;
    endTime: string;
    durationSeconds: number;
  };
  statistics: {
    totalReceipts: number;
    averageAttestationsPerReceipt: number;
    percentFinalized: number;
    timeToTwoThirdsAverage: number;
  };
  validators: {
    committeeSize: number;
    quorumSize: number;
    participationRate: number;
  };
  distribution: {
    attestationCounts: Record<number, number>;
  };
  errors: string[];
  warnings: string[];
}

export interface TransactionSpeedBenchmark {
  transactionHash?: string;
  timing: {
    submittedAt: string;
    firstReceiptAt?: string;
    twoThirdsAt?: string;
    fullyAttestedAt?: string;
  };
  durations: {
    timeToFirstReceipt?: number;
    timeToTwoThirds?: number;
    timeToFullAttestation?: number;
  };
  attestations: {
    required: number;
    received: number;
  };
  status: 'Submitted' | 'Pending' | 'Finalized' | 'Failed';
  errors: string[];
  warnings: string[];
}

/**
 * analyze_pod_performance - Network performance metrics
 *
 * Combines:
 * - pod_listReceipts (time windows)
 * - pod_pastPerfectTime (finality checkpoint)
 * - pod_getCommittee (validator count)
 */
export async function analyze_pod_performance(params?: [{ windowSeconds?: number }]): Promise<any> {
  try {
    const [{ windowSeconds = 60 }] = params || [{}];

    logger.info('analyze_pod_performance_start', { windowSeconds });

    const currentTime = Date.now() * 1000; // Microseconds
    const startTime = currentTime - windowSeconds * 1000000;

    const metrics: PodPerformanceMetrics = {
      timeWindow: {
        startTime: new Date(startTime / 1000).toISOString(),
        endTime: new Date(currentTime / 1000).toISOString(),
        durationSeconds: windowSeconds
      },
      throughput: {
        receiptsPerSecond: 0,
        totalReceipts: 0,
        trend: 'Stable'
      },
      finality: {
        averageAttestations: 0,
        averageTimeToTwoThirds: 0,
        percentFinalized: 0
      },
      latency: {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      },
      validators: {
        committeeSize: 0,
        quorumSize: 0
      },
      errors: [],
      warnings: []
    };

    // Fetch receipts and committee in parallel
    const [receiptsResult, committeeResult] = await Promise.allSettled([
      rpcClient.call('pod_listReceipts', [{ since: startTime }]),
      rpcClient.call('pod_getCommittee', [])
    ]);

    // Process receipts
    if (receiptsResult.status === 'fulfilled' && receiptsResult.value) {
      const receipts = Array.isArray(receiptsResult.value) ? receiptsResult.value : [];
      metrics.throughput.totalReceipts = receipts.length;
      metrics.throughput.receiptsPerSecond = receipts.length / windowSeconds;

      if (receipts.length > 0) {
        // Calculate attestation statistics
        const attestationCounts = receipts.map((r: any) => r.pod_metadata?.attestations || 0);

        if (attestationCounts.length > 0) {
          const sum = attestationCounts.reduce((a: number, b: number) => a + b, 0);
          metrics.finality.averageAttestations = sum / attestationCounts.length;
        }

        // Calculate finalized percentage (assuming quorum of 3 for 5-node committee)
        const finalizedCount = attestationCounts.filter((count: number) => count >= 3).length;
        metrics.finality.percentFinalized = (finalizedCount / receipts.length) * 100;

        // Calculate latency percentiles from timestamps
        const timestamps = receipts
          .map((r: any) => r.pod_metadata?.timestamp)
          .filter(Boolean)
          .map((ts: string) => new Date(ts).getTime())
          .sort((a: number, b: number) => a - b);

        if (timestamps.length > 1) {
          // Calculate inter-receipt latencies
          const latencies: number[] = [];
          for (let i = 1; i < timestamps.length; i++) {
            latencies.push(timestamps[i] - timestamps[i - 1]);
          }

          latencies.sort((a, b) => a - b);

          metrics.latency.p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
          metrics.latency.p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
          metrics.latency.p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
          metrics.latency.p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
        }
      }
    } else {
      metrics.errors.push('Failed to fetch receipts');
    }

    // Process committee
    if (committeeResult.status === 'fulfilled' && committeeResult.value) {
      const committee = committeeResult.value;

      if (committee.replicas && Array.isArray(committee.replicas)) {
        metrics.validators.committeeSize = committee.replicas.length;
      }

      if (committee.quorum_size) {
        metrics.validators.quorumSize = committee.quorum_size;
      } else if (metrics.validators.committeeSize > 0) {
        metrics.validators.quorumSize = Math.ceil((metrics.validators.committeeSize * 2) / 3);
      }
    } else {
      metrics.warnings.push('Could not fetch committee information');
    }

    // Cache the performance metrics (5 second TTL)
    const cacheKey = `analyze_pod_performance:${windowSeconds}`;
    cache.set('networkStats', cacheKey, metrics);

    logger.info('analyze_pod_performance_complete', {
      receiptsPerSecond: metrics.throughput.receiptsPerSecond,
      percentFinalized: metrics.finality.percentFinalized,
      errorCount: metrics.errors.length
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result: metrics }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(
      'analyze_pod_performance_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * track_attestation_performance - Attestation statistics
 *
 * Combines:
 * - pod_listReceipts (with attestations)
 * - pod_getCommittee (quorum calculation)
 */
export async function track_attestation_performance(
  params?: [{ windowSeconds?: number }]
): Promise<any> {
  try {
    const [{ windowSeconds = 60 }] = params || [{}];

    logger.info('track_attestation_performance_start', { windowSeconds });

    const currentTime = Date.now() * 1000; // Microseconds
    const startTime = currentTime - windowSeconds * 1000000;

    const performance: AttestationPerformance = {
      timeWindow: {
        startTime: new Date(startTime / 1000).toISOString(),
        endTime: new Date(currentTime / 1000).toISOString(),
        durationSeconds: windowSeconds
      },
      statistics: {
        totalReceipts: 0,
        averageAttestationsPerReceipt: 0,
        percentFinalized: 0,
        timeToTwoThirdsAverage: 0
      },
      validators: {
        committeeSize: 0,
        quorumSize: 0,
        participationRate: 0
      },
      distribution: {
        attestationCounts: {}
      },
      errors: [],
      warnings: []
    };

    // Fetch receipts and committee in parallel
    const [receiptsResult, committeeResult] = await Promise.allSettled([
      rpcClient.call('pod_listReceipts', [{ since: startTime }]),
      rpcClient.call('pod_getCommittee', [])
    ]);

    // Process committee first to get quorum size
    if (committeeResult.status === 'fulfilled' && committeeResult.value) {
      const committee = committeeResult.value;

      if (committee.replicas && Array.isArray(committee.replicas)) {
        performance.validators.committeeSize = committee.replicas.length;
      }

      if (committee.quorum_size) {
        performance.validators.quorumSize = committee.quorum_size;
      } else if (performance.validators.committeeSize > 0) {
        performance.validators.quorumSize = Math.ceil(
          (performance.validators.committeeSize * 2) / 3
        );
      }
    } else {
      performance.warnings.push('Could not fetch committee information');
      // Assume common setup
      performance.validators.committeeSize = 5;
      performance.validators.quorumSize = 3;
    }

    // Process receipts
    if (receiptsResult.status === 'fulfilled' && receiptsResult.value) {
      const receipts = Array.isArray(receiptsResult.value) ? receiptsResult.value : [];
      performance.statistics.totalReceipts = receipts.length;

      if (receipts.length > 0) {
        // Extract attestation counts
        const attestationCounts = receipts.map((r: any) => r.pod_metadata?.attestations || 0);

        // Calculate average
        const sum = attestationCounts.reduce((a: number, b: number) => a + b, 0);
        performance.statistics.averageAttestationsPerReceipt = sum / attestationCounts.length;

        // Calculate distribution
        attestationCounts.forEach((count: number) => {
          performance.distribution.attestationCounts[count] =
            (performance.distribution.attestationCounts[count] || 0) + 1;
        });

        // Calculate finalized percentage
        const finalizedCount = attestationCounts.filter(
          (count: number) => count >= performance.validators.quorumSize
        ).length;
        performance.statistics.percentFinalized = (finalizedCount / receipts.length) * 100;

        // Calculate validator participation rate
        if (performance.validators.committeeSize > 0) {
          performance.validators.participationRate =
            (performance.statistics.averageAttestationsPerReceipt /
              performance.validators.committeeSize) *
            100;
        }
      }
    } else {
      performance.errors.push('Failed to fetch receipts');
    }

    // Cache the attestation performance (5 second TTL)
    const cacheKey = `track_attestation_performance:${windowSeconds}`;
    cache.set('networkStats', cacheKey, performance);

    logger.info('track_attestation_performance_complete', {
      totalReceipts: performance.statistics.totalReceipts,
      averageAttestations: performance.statistics.averageAttestationsPerReceipt,
      percentFinalized: performance.statistics.percentFinalized,
      errorCount: performance.errors.length
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result: performance }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(
      'track_attestation_performance_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * benchmark_transaction_speed - Transaction speed benchmarks
 *
 * NOTE: This tool requires a signed transaction to be provided by the user.
 * It will submit the transaction and track its progress through attestation stages.
 *
 * Combines:
 * - eth_sendRawTransaction (submit transaction)
 * - eth_getTransactionReceipt (polling for receipt)
 * - pod_getCommittee (quorum calculation)
 */
export async function benchmark_transaction_speed(
  params: [{ signedTx: string; pollIntervalMs?: number; maxPollAttempts?: number }]
): Promise<any> {
  try {
    const [{ signedTx, pollIntervalMs = 500, maxPollAttempts = 40 }] = params;

    logger.info('benchmark_transaction_speed_start', { pollIntervalMs, maxPollAttempts });

    const benchmark: TransactionSpeedBenchmark = {
      timing: {
        submittedAt: new Date().toISOString()
      },
      durations: {},
      attestations: {
        required: 0,
        received: 0
      },
      status: 'Submitted',
      errors: [],
      warnings: []
    };

    const startTime = Date.now();

    // Submit transaction
    try {
      const txHash = await rpcClient.call('eth_sendRawTransaction', [signedTx]);
      benchmark.transactionHash = txHash;
      benchmark.status = 'Pending';

      logger.info('transaction_submitted', { txHash });
    } catch (error) {
      benchmark.errors.push('Failed to submit transaction');
      benchmark.status = 'Failed';
      throw error;
    }

    // Fetch committee to know required attestations
    try {
      const committee = await rpcClient.call('pod_getCommittee', []);
      if (committee.quorum_size) {
        benchmark.attestations.required = committee.quorum_size;
      } else if (committee.replicas && Array.isArray(committee.replicas)) {
        benchmark.attestations.required = Math.ceil((committee.replicas.length * 2) / 3);
      }
    } catch (error) {
      benchmark.warnings.push('Could not fetch committee, assuming quorum of 3');
      benchmark.attestations.required = 3;
    }

    // Poll for receipt
    let attempts = 0;
    let receipt: any = null;
    let firstReceiptTime: number | null = null;
    let twoThirdsTime: number | null = null;
    let fullyAttestedTime: number | null = null;

    while (attempts < maxPollAttempts && !fullyAttestedTime) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      attempts++;

      try {
        receipt = await rpcClient.call('eth_getTransactionReceipt', [benchmark.transactionHash!]);

        if (receipt) {
          const currentTime = Date.now();

          // Record first receipt
          if (!firstReceiptTime) {
            firstReceiptTime = currentTime;
            benchmark.timing.firstReceiptAt = new Date(currentTime).toISOString();
            benchmark.durations.timeToFirstReceipt = (currentTime - startTime) / 1000;
          }

          // Check attestations
          const attestations = receipt.pod_metadata?.attestations || 0;
          benchmark.attestations.received = attestations;

          // Record 2/3 threshold
          if (attestations >= benchmark.attestations.required && !twoThirdsTime) {
            twoThirdsTime = currentTime;
            benchmark.timing.twoThirdsAt = new Date(currentTime).toISOString();
            benchmark.durations.timeToTwoThirds = (currentTime - startTime) / 1000;
            benchmark.status = 'Finalized';
          }

          // Check for full attestation
          const committeeSize = benchmark.attestations.required * 1.5; // Rough estimate
          if (attestations >= committeeSize) {
            fullyAttestedTime = currentTime;
            benchmark.timing.fullyAttestedAt = new Date(currentTime).toISOString();
            benchmark.durations.timeToFullAttestation = (currentTime - startTime) / 1000;
          }
        }
      } catch (error) {
        // Receipt not available yet, continue polling
      }
    }

    if (!receipt) {
      benchmark.warnings.push('Transaction receipt not available after polling');
    }

    logger.info('benchmark_transaction_speed_complete', {
      txHash: benchmark.transactionHash,
      status: benchmark.status,
      timeToTwoThirds: benchmark.durations.timeToTwoThirds,
      attestations: `${benchmark.attestations.received}/${benchmark.attestations.required}`
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result: benchmark }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(
      'benchmark_transaction_speed_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

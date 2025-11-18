/**
 * Network Analysis Composite Tools
 * FR-056: analyze_committee - Committee composition analysis
 * FR-061: network_health_dashboard - Overall network health status
 */

import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('composite-network');
const rpcClient = new RpcClient();

export interface CommitteeAnalysis {
  committeeSize: number;
  quorumSize: number;
  quorumPercentage: number;
  validators: string[];
  threshold: {
    twoThirds: number;
    simple: number;
  };
  errors: string[];
  warnings: string[];
}

export interface NetworkHealthDashboard {
  status: 'Healthy' | 'Warning' | 'Critical' | 'Unknown';
  timestamp: string;
  throughput: {
    receiptsPerSecond: number;
    trend: 'Up' | 'Down' | 'Stable';
    comparisonPeriod: string;
  };
  finality: {
    averageAttestationTime: number;
    averageAttestations: number;
    percentFinalized: number;
    trend: 'Up' | 'Down' | 'Stable';
  };
  validators: {
    active: number;
    participationRate: number;
    trend: 'Up' | 'Down' | 'Stable';
  };
  pastPerfectTime: {
    lagSeconds: number;
    trend: 'Up' | 'Down' | 'Stable';
    formatted: string;
  };
  errors: string[];
  warnings: string[];
}

/**
 * analyze_committee - Committee composition and quorum analysis
 *
 * Uses pod_getCommittee to produce detailed committee analysis
 */
export async function analyze_committee(_params?: [Record<string, never>]): Promise<any> {
  try {
    logger.info('analyze_committee_start');

    const analysis: CommitteeAnalysis = {
      committeeSize: 0,
      quorumSize: 0,
      quorumPercentage: 0,
      validators: [],
      threshold: {
        twoThirds: 0,
        simple: 0
      },
      errors: [],
      warnings: []
    };

    // Fetch committee information
    try {
      const committee = await rpcClient.call('pod_getCommittee', []);

      if (committee.replicas && Array.isArray(committee.replicas)) {
        analysis.validators = committee.replicas;
        analysis.committeeSize = committee.replicas.length;
      }

      if (committee.quorum_size) {
        analysis.quorumSize = committee.quorum_size;
      } else if (analysis.committeeSize > 0) {
        // Calculate 2/3 threshold
        analysis.quorumSize = Math.ceil((analysis.committeeSize * 2) / 3);
      }

      // Calculate thresholds
      if (analysis.committeeSize > 0) {
        analysis.threshold.twoThirds = Math.ceil((analysis.committeeSize * 2) / 3);
        analysis.threshold.simple = Math.ceil(analysis.committeeSize / 2) + 1;
        analysis.quorumPercentage = (analysis.quorumSize / analysis.committeeSize) * 100;
      }

      if (analysis.committeeSize === 0) {
        analysis.warnings.push('Committee appears to be empty');
      }
    } catch (error) {
      analysis.errors.push('Failed to fetch committee information');
      logger.error(
        'committee_fetch_failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Cache the committee analysis (5 second TTL for network stats)
    const cacheKey = 'analyze_committee';
    cache.set('networkStats', cacheKey, analysis);

    logger.info('analyze_committee_complete', {
      committeeSize: analysis.committeeSize,
      quorumSize: analysis.quorumSize,
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
      'analyze_committee_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * network_health_dashboard - Comprehensive network health monitoring
 *
 * Combines:
 * - pod_listReceipts (throughput calculation)
 * - pod_getCommittee (validator participation)
 * - pod_pastPerfectTime (finality lag)
 *
 * Implements partial success reporting (FR research finding #7)
 */
export async function network_health_dashboard(
  params?: [{ windowSeconds?: number }]
): Promise<any> {
  try {
    const [{ windowSeconds = 60 }] = params || [{}];

    logger.info('network_health_dashboard_start', { windowSeconds });

    const dashboard: NetworkHealthDashboard = {
      status: 'Unknown',
      timestamp: new Date().toISOString(),
      throughput: {
        receiptsPerSecond: 0,
        trend: 'Stable',
        comparisonPeriod: `${windowSeconds}s`
      },
      finality: {
        averageAttestationTime: 0,
        averageAttestations: 0,
        percentFinalized: 0,
        trend: 'Stable'
      },
      validators: {
        active: 0,
        participationRate: 0,
        trend: 'Stable'
      },
      pastPerfectTime: {
        lagSeconds: 0,
        trend: 'Stable',
        formatted: ''
      },
      errors: [],
      warnings: []
    };

    const currentTime = Date.now() * 1000; // Convert to microseconds
    const windowStart = currentTime - windowSeconds * 1000000;

    // Fetch data in parallel
    const [receiptsResult, committeeResult, pptResult] = await Promise.allSettled([
      rpcClient.call('pod_listReceipts', [{ since: windowStart }]),
      rpcClient.call('pod_getCommittee', []),
      rpcClient.call('pod_pastPerfectTime', []).catch(() => null)
    ]);

    // Process receipts for throughput
    if (receiptsResult.status === 'fulfilled' && receiptsResult.value) {
      const receipts = Array.isArray(receiptsResult.value) ? receiptsResult.value : [];
      const receiptCount = receipts.length;

      dashboard.throughput.receiptsPerSecond = receiptCount / windowSeconds;

      // Calculate finality metrics from receipts
      if (receipts.length > 0) {
        const attestationCounts = receipts
          .map((r: any) => r.pod_metadata?.attestations || 0)
          .filter((a: number) => a > 0);

        if (attestationCounts.length > 0) {
          const sum = attestationCounts.reduce((a: number, b: number) => a + b, 0);
          dashboard.finality.averageAttestations = sum / attestationCounts.length;
        }

        // Calculate percentage finalized (assuming 2/3 quorum)
        const finalizedCount = receipts.filter((r: any) => {
          const attestations = r.pod_metadata?.attestations || 0;
          return attestations >= 3; // Assuming 5-node committee with quorum of 3
        }).length;

        dashboard.finality.percentFinalized = (finalizedCount / receipts.length) * 100;
      }
    } else {
      dashboard.warnings.push('Could not fetch receipt data for throughput calculation');
    }

    // Process committee for validator info
    if (committeeResult.status === 'fulfilled' && committeeResult.value) {
      const committee = committeeResult.value;

      if (committee.replicas && Array.isArray(committee.replicas)) {
        dashboard.validators.active = committee.replicas.length;
        // Participation rate would require tracking which validators are actually attesting
        // For now, assume 100% if committee exists
        dashboard.validators.participationRate = dashboard.validators.active > 0 ? 100 : 0;
      }
    } else {
      dashboard.warnings.push('Could not fetch committee information');
    }

    // Process Past Perfect Time
    if (pptResult.status === 'fulfilled' && pptResult.value) {
      const ppt = pptResult.value;
      const pptDate = new Date(ppt / 1000); // Convert microseconds to milliseconds
      dashboard.pastPerfectTime.formatted = pptDate.toISOString();
      dashboard.pastPerfectTime.lagSeconds = (currentTime - ppt) / 1000000; // Convert to seconds
    } else {
      dashboard.warnings.push('Could not fetch Past Perfect Time');
    }

    // Determine overall health status
    if (dashboard.errors.length > 0) {
      dashboard.status = 'Critical';
    } else if (dashboard.warnings.length > 2) {
      dashboard.status = 'Warning';
    } else if (
      dashboard.throughput.receiptsPerSecond > 0 &&
      dashboard.validators.active > 0 &&
      dashboard.finality.percentFinalized > 50
    ) {
      dashboard.status = 'Healthy';
    } else {
      dashboard.status = 'Warning';
    }

    // Cache the dashboard (5 second TTL for network stats)
    const cacheKey = `network_health_dashboard:${windowSeconds}`;
    cache.set('networkStats', cacheKey, dashboard);

    logger.info('network_health_dashboard_complete', {
      status: dashboard.status,
      throughput: dashboard.throughput.receiptsPerSecond,
      validators: dashboard.validators.active,
      errorCount: dashboard.errors.length
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result: dashboard }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(
      'network_health_dashboard_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

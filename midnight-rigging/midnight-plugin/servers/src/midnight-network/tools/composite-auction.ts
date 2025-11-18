/**
 * Auction Analysis Composite Tool
 * FR-054: Combines auction data with bidder profiles and activity
 */

import { RpcClient } from '../client.js';
import { IndexerClient } from '../indexer-client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('composite-auction');
const rpcClient = new RpcClient();
const indexerClient = new IndexerClient();

export interface BidderProfile {
  address: string;
  balance: string;
  transactionCount: number;
  recentActivity: any[];
}

export interface AuctionAnalysis {
  auctionId: string;
  auction: any;
  status: 'Active' | 'Ended' | 'Unknown';
  bids: any[];
  winner?: any;
  bidderProfiles: BidderProfile[];
  timeline: {
    created?: string;
    firstBid?: string;
    lastBid?: string;
    ended?: string;
  };
  statistics: {
    totalBids: number;
    uniqueBidders: number;
    highestBid?: string;
    lowestBid?: string;
    averageBid?: string;
  };
  errors: string[];
  warnings: string[];
}

/**
 * analyze_auction - Comprehensive auction analysis
 *
 * Combines:
 * - indexer_getAuction (auction details)
 * - indexer_listAuctionBids (all bids)
 * - indexer_getWinningBid (winner if ended)
 * - eth_getBalance (bidder balances)
 * - indexer_listNormalTransactions (bidder activity)
 *
 * Implements partial success reporting (FR research finding #7)
 */
export async function analyze_auction(
  params: [{ auctionId: string; includeBidderProfiles?: boolean }]
): Promise<any> {
  try {
    const [{ auctionId, includeBidderProfiles = true }] = params;

    logger.info('analyze_auction_start', { auctionId, includeBidderProfiles });

    const analysis: AuctionAnalysis = {
      auctionId,
      auction: null,
      status: 'Unknown',
      bids: [],
      bidderProfiles: [],
      timeline: {},
      statistics: {
        totalBids: 0,
        uniqueBidders: 0
      },
      errors: [],
      warnings: []
    };

    // Fetch auction data
    try {
      analysis.auction = await indexerClient.call('GET', '/data/auctions/single', {
        params: { auctionId }
      });

      // Determine auction status
      if (analysis.auction) {
        if (analysis.auction.endTime && new Date(analysis.auction.endTime) < new Date()) {
          analysis.status = 'Ended';
        } else if (
          analysis.auction.startTime &&
          new Date(analysis.auction.startTime) <= new Date()
        ) {
          analysis.status = 'Active';
        }

        analysis.timeline.created = analysis.auction.createdAt || analysis.auction.startTime;
      }
    } catch (error) {
      analysis.errors.push('Failed to fetch auction details');
      logger.error(
        'auction_fetch_failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }

    // Fetch bids and winning bid in parallel
    const [bidsResult, winningBidResult] = await Promise.allSettled([
      indexerClient.call('GET', '/data/auctions/bids', { params: { auctionId } }),
      analysis.status === 'Ended'
        ? indexerClient.call('GET', '/data/auctions/bid/winning', { params: { auctionId } })
        : Promise.resolve(null)
    ]);

    // Process bids
    if (bidsResult.status === 'fulfilled' && bidsResult.value) {
      const bidsData = bidsResult.value as any;
      analysis.bids = bidsData.items || bidsData.result || [];
      analysis.statistics.totalBids = analysis.bids.length;

      // Extract unique bidders
      const bidderAddresses = new Set(
        analysis.bids.map((bid: any) => bid.bidder || bid.address).filter(Boolean)
      );
      analysis.statistics.uniqueBidders = bidderAddresses.size;

      // Calculate bid statistics
      const bidAmounts = analysis.bids.map((bid: any) => BigInt(bid.amount || '0'));
      if (bidAmounts.length > 0) {
        analysis.statistics.highestBid = bidAmounts.reduce((a, b) => (a > b ? a : b)).toString();
        analysis.statistics.lowestBid = bidAmounts.reduce((a, b) => (a < b ? a : b)).toString();

        const sum = bidAmounts.reduce((a, b) => a + b, BigInt(0));
        analysis.statistics.averageBid = (sum / BigInt(bidAmounts.length)).toString();
      }

      // Extract timeline from bids
      const bidTimestamps = analysis.bids
        .map((bid: any) => bid.timestamp)
        .filter(Boolean)
        .sort();

      if (bidTimestamps.length > 0) {
        analysis.timeline.firstBid = bidTimestamps[0];
        analysis.timeline.lastBid = bidTimestamps[bidTimestamps.length - 1];
      }
    } else {
      analysis.warnings.push('Could not fetch auction bids');
    }

    // Process winning bid
    if (winningBidResult.status === 'fulfilled' && winningBidResult.value) {
      analysis.winner = winningBidResult.value;
      analysis.timeline.ended = analysis.winner.timestamp || analysis.auction?.endTime;
    }

    // Fetch bidder profiles if requested
    if (includeBidderProfiles && analysis.bids.length > 0) {
      const bidderAddresses = [
        ...new Set(analysis.bids.map((bid: any) => bid.bidder || bid.address).filter(Boolean))
      ];

      // Limit to top 10 bidders to avoid excessive queries
      const topBidders = bidderAddresses.slice(0, 10);

      logger.info('fetching_bidder_profiles', { count: topBidders.length });

      const bidderProfileResults = await Promise.allSettled(
        topBidders.map(async address => {
          const profile: BidderProfile = {
            address,
            balance: '0x0',
            transactionCount: 0,
            recentActivity: []
          };

          try {
            // Fetch balance and transaction count in parallel
            const [balanceResult, txCountResult, activityResult] = await Promise.allSettled([
              rpcClient.call('eth_getBalance', [address, 'latest']),
              rpcClient.call('eth_getTransactionCount', [address, 'latest']),
              indexerClient.call('GET', '/data/normal-transactions', {
                params: { address, take: 5 }
              })
            ]);

            if (balanceResult.status === 'fulfilled') {
              profile.balance = balanceResult.value;
            }

            if (txCountResult.status === 'fulfilled') {
              profile.transactionCount = parseInt(txCountResult.value, 16);
            }

            if (activityResult.status === 'fulfilled' && activityResult.value) {
              const activityData = activityResult.value as any;
              profile.recentActivity = activityData.items || activityData.result || [];
            }
          } catch (error) {
            logger.warning('bidder_profile_partial_failure', { address, error });
          }

          return profile;
        })
      );

      analysis.bidderProfiles = bidderProfileResults
        .filter(
          (result): result is PromiseFulfilledResult<BidderProfile> => result.status === 'fulfilled'
        )
        .map(result => result.value);

      if (analysis.bidderProfiles.length < topBidders.length) {
        analysis.warnings.push(
          `Only fetched ${analysis.bidderProfiles.length} of ${topBidders.length} bidder profiles`
        );
      }
    }

    // Cache the analysis (1 hour TTL for auction analysis)
    const cacheKey = `analyze_auction:${auctionId}:${includeBidderProfiles}`;
    cache.set('contracts', cacheKey, analysis);

    logger.info('analyze_auction_complete', {
      auctionId,
      status: analysis.status,
      totalBids: analysis.statistics.totalBids,
      uniqueBidders: analysis.statistics.uniqueBidders,
      errorCount: analysis.errors.length,
      warningCount: analysis.warnings.length
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
      'analyze_auction_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

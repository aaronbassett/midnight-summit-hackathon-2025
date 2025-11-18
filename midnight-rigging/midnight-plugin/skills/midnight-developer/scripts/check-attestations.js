#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console */

/**
 * check-attestations.js
 *
 * Checks transaction finality on pod network via attestation count.
 * pod network uses attestations instead of block confirmations.
 *
 * Usage:
 *   node check-attestations.js <txHash> [rpcUrl]
 *
 * Example:
 *   node check-attestations.js 0x1234... https://rpc.v1.dev.pod.network/
 *
 * Returns:
 *   - Transaction status
 *   - Attestation count and committee size
 *   - Finality status (finalized when >2/3 attestations)
 *   - Confidence level
 */

const https = require('https');
const http = require('http');

function rpcRequest(url, method, params) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    });

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = protocol.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function checkAttestations(txHash, rpcUrl) {
  console.log(`\n🔍 Checking attestations for transaction: ${txHash}`);
  console.log(`   RPC: ${rpcUrl}\n`);

  // Get transaction receipt
  const receipt = await rpcRequest(rpcUrl, 'eth_getTransactionReceipt', [txHash]);

  if (!receipt) {
    console.log('❌ Transaction not found or not yet confirmed');
    return;
  }

  // Extract pod metadata
  const podMetadata = receipt.pod_metadata;
  if (!podMetadata) {
    console.log('⚠️  No pod_metadata found - not a pod network transaction?');
    return;
  }

  const attestations = podMetadata.attestations || 0;
  const committeeSize = podMetadata.committee_size || 0;
  const quorumReached = podMetadata.quorum_reached || false;

  // Calculate finality
  const byzantineThreshold = Math.ceil((committeeSize * 2) / 3);
  const isFinalized = attestations >= byzantineThreshold;
  const attestationPercent =
    committeeSize > 0 ? ((attestations / committeeSize) * 100).toFixed(1) : 0;

  // Display results
  console.log('📊 Transaction Status:');
  console.log(`   Status: ${receipt.status === '0x1' ? '✅ Success' : '❌ Failed'}`);
  console.log(`   From: ${receipt.from}`);
  console.log(`   To: ${receipt.to || '(Contract Creation)'}`);
  console.log(`   Gas Used: ${parseInt(receipt.gasUsed, 16)}`);
  console.log('');

  console.log('🔐 pod network Finality:');
  console.log(`   Attestations: ${attestations} / ${committeeSize} (${attestationPercent}%)`);
  console.log(`   Byzantine Threshold (2/3): ${byzantineThreshold}`);
  console.log(`   Quorum Reached: ${quorumReached ? '✅ Yes' : '❌ No'}`);
  console.log(`   Finalized: ${isFinalized ? '✅ YES' : '⏳ PENDING'}`);
  console.log('');

  // Confidence level
  let confidence;
  if (attestations >= byzantineThreshold) {
    confidence = 'HIGH - Byzantine fault tolerant';
  } else if (attestations >= committeeSize / 2) {
    confidence = 'MEDIUM - Majority confirmed';
  } else if (attestations > 0) {
    confidence = 'LOW - Partial confirmation';
  } else {
    confidence = 'NONE - No attestations yet';
  }

  console.log(`   Confidence: ${confidence}`);
  console.log('');

  // pod-specific note
  console.log('💡 pod network Note:');
  console.log('   pod uses attestations instead of block confirmations.');
  console.log('   Finality occurs at >2/3 attestations (Byzantine threshold).');
  console.log('   No need to wait for multiple blocks - finality is ~150ms!');
  console.log('');

  return {
    finalized: isFinalized,
    attestations,
    committeeSize,
    confidence,
    byzantineThreshold
  };
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node check-attestations.js <txHash> [rpcUrl]');
    console.error('');
    console.error('Example:');
    console.error('  node check-attestations.js 0x1234... https://rpc.v1.dev.pod.network/');
    console.error('');
    console.error('Environment variables:');
    console.error('  MIDNIGHT_RPC_URL - Default RPC endpoint if not provided');
    process.exit(1);
  }

  const txHash = args[0];
  const rpcUrl = args[1] || process.env.MIDNIGHT_RPC_URL || 'https://rpc.v1.dev.pod.network/';

  checkAttestations(txHash, rpcUrl)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err.message);
      process.exit(1);
    });
}

module.exports = { checkAttestations };

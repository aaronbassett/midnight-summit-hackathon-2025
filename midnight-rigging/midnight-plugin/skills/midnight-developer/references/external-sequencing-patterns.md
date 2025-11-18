# External Sequencing Patterns for Order-Dependent Applications

When your application **inherently requires** strict transaction ordering, you need external sequencing. This document explains when and how.

## When You Need External Sequencing

### Inherently Order-Dependent Use Cases

1. **DEX Order Books** - Price-time priority matters
2. **Auctions with MEV** - Bid timing affects outcome
3. **FIFO Queues** - First-in-first-out is the point
4. **Priority Systems** - Order determines allocation
5. **Rate Limiting** - Strict request ordering
6. **Sequenced Rollups** - Pre-ordered transaction batches

### When You DON'T Need It

- ✅ Token transfers (use Balance FastType)
- ✅ Voting (use AddressSet + counters)
- ✅ NFT minting (use SharedCounter)
- ✅ Most DeFi primitives (redesign with FastTypes)

**Try FastTypes first** - Most "order-dependent" apps can be redesigned as order-independent.

---

## Architecture: Sequencer + pod network

```
┌─────────────┐
│    Users    │
└──────┬──────┘
       │ Submit transactions
       ↓
┌──────────────┐
│  Sequencer   │ ← Off-protocol component
│  (Ordered)   │    (Centralized or committee)
└──────┬───────┘
       │ Ordered batch
       ↓
┌──────────────┐
│ pod network  │ ← Executes pre-ordered batch
│  Validators  │    (Fast finality for the batch)
└──────────────┘
```

**Key Insight**: Sequencer provides ordering, pod network provides fast finality.

---

## Pattern 1: Centralized Sequencer

**Best For**: Prototypes, internal tools, trusted environments

### Architecture

```solidity
// On pod network
contract SequencedExecutor {
    address public sequencer;
    uint256 public lastBatchId;

    event BatchExecuted(uint256 batchId, uint256 txCount);

    function executeBatch(
        uint256 batchId,
        bytes[] calldata transactions
    ) public {
        require(msg.sender == sequencer, "Only sequencer");
        require(batchId == lastBatchId + 1, "Invalid batch ID");

        for (uint256 i = 0; i < transactions.length; i++) {
            _executeTx(transactions[i]);
        }

        lastBatchId = batchId;
        emit BatchExecuted(batchId, transactions.length);
    }

    function _executeTx(bytes calldata txData) internal {
        // Decode and execute transaction
        // Order is guaranteed within batch
    }
}
```

### Off-Chain Sequencer (Node.js Example)

```javascript
class Sequencer {
  constructor(rpcUrl, privateKey, contractAddress) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, ABI, this.wallet);
    this.pendingTxs = [];
    this.batchId = 0;
  }

  // Users submit to sequencer
  async submitTransaction(txData) {
    this.pendingTxs.push(txData);
    return { queued: true, position: this.pendingTxs.length };
  }

  // Sequencer batches and submits to pod network
  async processBatch() {
    if (this.pendingTxs.length === 0) return;

    const batch = this.pendingTxs.splice(0, 100); // Take up to 100
    this.batchId++;

    const tx = await this.contract.executeBatch(this.batchId, batch);
    const receipt = await tx.wait();

    console.log(
      `Batch ${this.batchId} finalized in ${receipt.pod_metadata.attestations} attestations`
    );
  }
}
```

### Trade-offs

**Pros:**

- ✅ Simple to implement
- ✅ Full control over ordering
- ✅ Gets pod network's fast finality for batches
- ✅ Can implement custom ordering rules

**Cons:**

- ❌ Centralization point (sequencer can censor)
- ❌ Sequencer adds latency
- ❌ Single point of failure
- ❌ Trust assumptions

---

## Pattern 2: Committee-Based Sequencer

**Best For**: Production systems needing decentralization

### Architecture

```solidity
contract CommitteeSequencer {
    address[] public committee;
    uint256 public threshold; // e.g., 2/3

    mapping(uint256 => mapping(address => bytes32)) public batchHashes;
    mapping(uint256 => uint256) public signatures;

    event BatchProposed(uint256 batchId, bytes32 batchHash, address proposer);
    event BatchExecuted(uint256 batchId);

    // Committee member proposes batch
    function proposeBatch(uint256 batchId, bytes32 batchHash) public {
        require(isCommitteeMember(msg.sender), "Not committee");

        batchHashes[batchId][msg.sender] = batchHash;
        signatures[batchId]++;

        emit BatchProposed(batchId, batchHash, msg.sender);

        if (signatures[batchId] >= threshold) {
            // Enough signatures, can execute
            _executeBatch(batchId, batchHash);
        }
    }

    function _executeBatch(uint256 batchId, bytes32 batchHash) internal {
        // Verify threshold reached
        require(signatures[batchId] >= threshold, "Not enough signatures");

        // Execute the agreed-upon batch
        // (Batch data stored off-chain, hash on-chain)

        emit BatchExecuted(batchId);
    }
}
```

### Trade-offs

**Pros:**

- ✅ Decentralized (no single sequencer)
- ✅ Byzantine fault tolerant (up to 1/3 malicious)
- ✅ Censorship resistant

**Cons:**

- ❌ More complex to implement
- ❌ Committee coordination adds latency
- ❌ Committee must be maintained

---

## Pattern 3: Auction-Based Sequencing

**Best For**: MEV-aware applications, public goods funding

### Architecture

```solidity
contract AuctionSequencer {
    struct Batch {
        address sequencer;
        uint256 payment;
        bytes32 batchHash;
    }

    mapping(uint256 => Batch) public batches;
    uint256 public currentBatch;

    // Anyone can bid to sequence next batch
    function bidToSequence(uint256 batchId, bytes32 batchHash) public payable {
        require(batchId == currentBatch + 1, "Wrong batch");
        require(msg.value > batches[batchId].payment, "Bid too low");

        // Refund previous bidder
        if (batches[batchId].sequencer != address(0)) {
            payable(batches[batchId].sequencer).transfer(batches[batchId].payment);
        }

        batches[batchId] = Batch({
            sequencer: msg.sender,
            payment: msg.value,
            batchHash: batchHash
        });
    }

    // After auction closes, winner executes
    function executeBatch(uint256 batchId, bytes[] calldata transactions) public {
        require(msg.sender == batches[batchId].sequencer, "Not winner");
        require(batchId == currentBatch + 1, "Wrong batch");

        // Verify batch matches hash
        require(keccak256(abi.encode(transactions)) == batches[batchId].batchHash, "Hash mismatch");

        // Execute ordered transactions
        for (uint256 i = 0; i < transactions.length; i++) {
            _executeTx(transactions[i]);
        }

        currentBatch++;

        // Payment goes to protocol/treasury
    }
}
```

### Trade-offs

**Pros:**

- ✅ Permissionless (anyone can bid)
- ✅ MEV goes to protocol
- ✅ Economic security

**Cons:**

- ❌ Auction adds latency
- ❌ Complex mechanism design
- ❌ Winner can still censor (within their batch)

---

## Implementation Checklist

### 1. Design Your Ordering Rules

**Questions:**

- What ordering property do you need? (FIFO, price-time, custom?)
- Who should control ordering? (Centralized, committee, auction?)
- How much latency is acceptable?
- What's your trust model?

### 2. Choose Sequencer Pattern

- **Centralized**: Simple, fast, but trust assumptions
- **Committee**: Decentralized, secure, but more complex
- **Auction**: Permissionless, MEV-aware, but expensive

### 3. Implement Sequencer

**Off-Chain Components:**

- Transaction receipt endpoint (users submit here)
- Ordering logic (your rules)
- Batch assembly
- Submission to pod network

**On-Chain Components:**

- Batch execution contract
- Access control (who can submit batches)
- Batch verification
- Order enforcement within batch

### 4. Handle Edge Cases

- **Sequencer downtime**: Backup sequencers or fallback mode
- **Invalid batches**: Reject and skip batch ID
- **Censorship**: Committee rotation or auction-based selection
- **MEV**: Auction-based sequencing or encrypted mempool

### 5. Monitor and Optimize

- **Batch size**: Balance latency vs throughput
- **Batch frequency**: How often to submit
- **Gas costs**: Batching saves gas on pod network
- **Finality**: Monitor attestations per batch

---

## Example: Simple DEX with Sequencer

```solidity
// On pod network
contract SequencedDEX {
    address public sequencer;

    struct Order {
        address trader;
        bool isBuy;
        uint256 price;
        uint256 amount;
    }

    event OrdersMatched(uint256 batchId, uint256 matched);

    // Sequencer submits ordered batch
    function matchOrders(uint256 batchId, Order[] calldata orders) public {
        require(msg.sender == sequencer, "Only sequencer");

        // Orders are pre-sorted by sequencer (price-time priority)
        uint256 matched = 0;

        for (uint256 i = 0; i < orders.length; i++) {
            if (_tryMatch(orders[i])) {
                matched++;
            }
        }

        emit OrdersMatched(batchId, matched);
    }

    function _tryMatch(Order calldata order) internal returns (bool) {
        // Match logic - order is guaranteed by sequencer
        // ...
        return true;
    }
}
```

**Sequencer (Off-Chain)**:

```javascript
async function sequenceOrders() {
  // 1. Collect pending orders
  const orders = await getPendingOrders();

  // 2. Sort by price-time priority (your DEX rules)
  orders.sort((a, b) => {
    if (a.price !== b.price) return b.price - a.price;
    return a.timestamp - b.timestamp;
  });

  // 3. Submit ordered batch to pod network
  const tx = await dex.matchOrders(batchId++, orders);
  await tx.wait(); // Fast finality!
}
```

---

## Hybrid Approach: Fast Types + Sequencing

You can combine FastTypes for most operations with sequencing for specific order-sensitive parts.

**Example: Token with Sequenced Auctions**

```solidity
import { Balance } from "pod-sdk/FastTypes.sol";

contract HybridDEX {
    // Most operations use FastTypes (order-free)
    mapping(address => Balance) public balances;

    address public auctionSequencer;

    // Regular transfers are order-free
    function transfer(address to, uint256 amount) public {
        balances[msg.sender].spend(amount);
        balances[to].credit(amount);
    }

    // But auctions need sequencing
    function executeAuction(
        uint256 auctionId,
        Bid[] calldata orderedBids
    ) public {
        require(msg.sender == auctionSequencer, "Only sequencer");
        // Process bids in order (sequencer-guaranteed)
    }
}
```

---

## Security Considerations

### Sequencer Risks

1. **Censorship**: Sequencer can refuse to include transactions
   - **Mitigation**: Committee-based, auction-based, or escape hatch

2. **Front-running**: Sequencer sees transactions before users
   - **Mitigation**: Encrypted mempool, commit-reveal

3. **Downtime**: Sequencer offline = no new transactions
   - **Mitigation**: Backup sequencers, fallback mode

4. **Centralization**: Single sequencer is a trust point
   - **Mitigation**: Committee or auction-based

### pod network Integration

- ✅ **Fast finality preserved**: Batch finalizes in ~150ms
- ✅ **Attestation-based security**: >2/3 validators confirm batch
- ⚠️ **Batch atomicity**: Entire batch succeeds or fails together
- ⚠️ **Gas costs**: Large batches may hit gas limits

---

## Resources

- **pod SDK**: https://docs.v1.pod.network/solidity-sdk
- **Rollup Sequencing**: Similar patterns to optimistic rollups
- **MEV Research**: flashbots.net

---

## Summary

| Pattern     | Decentralization | Complexity | Latency | Best For                   |
| ----------- | ---------------- | ---------- | ------- | -------------------------- |
| Centralized | Low              | Low        | Low     | Prototypes, internal tools |
| Committee   | High             | High       | Medium  | Production, public goods   |
| Auction     | High             | High       | High    | MEV-aware, permissionless  |

**Bottom Line**: If you truly need ordering, sequencing works. But try FastTypes first—most apps can be order-free!

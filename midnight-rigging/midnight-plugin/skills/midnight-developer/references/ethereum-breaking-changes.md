# Ethereum → pod network: Breaking Changes and Migration Guide

Complete checklist of Ethereum patterns that **break** on pod network and how to fix them.

## Executive Summary

**80% of Ethereum contracts will break on pod network without modification.**

Why? pod network has NO BLOCKS and NO GLOBAL ORDERING. Any contract that depends on:

- Transaction execution order
- Block numbers or block timing
- Race-free sequential execution

...will produce incorrect results or fail to reach consensus across validators.

## Critical Concept Differences

| Concept          | Ethereum                            | pod network                     |
| ---------------- | ----------------------------------- | ------------------------------- |
| **Blocks**       | Sequential, numbered blocks         | ❌ NO BLOCKS                    |
| **Global Order** | All txs ordered in blocks           | ❌ NO GLOBAL ORDERING           |
| **State**        | Single global state                 | Each validator has local state  |
| **Execution**    | Sequential, one tx at a time        | Parallel, order-independent     |
| **Finality**     | Block confirmations (probabilistic) | Attestations (>2/3 = confirmed) |
| **Time**         | `block.timestamp` consensus         | Validator-local, not consensus  |

---

## Block-Related Breaking Changes

### ❌ `block.number`

**Ethereum**:

```solidity
uint256 public lastBlock = block.number;

function updatePrice() public {
    require(block.number > lastBlock + 100, "Too soon");
    lastBlock = block.number;
    // update price
}
```

**pod network**: `block.number` is **always 0**.

**Fix**: Use attestation-based timing or SharedCounter

```solidity
import { SharedCounter } from "pod-sdk/FastTypes.sol";

SharedCounter public updates;

function updatePrice() public {
    updates.increment();  // Count updates instead of blocks
    // update price
}
```

---

### ❌ `block.timestamp` for Consensus

**Ethereum**:

```solidity
function bid() public payable {
    require(block.timestamp < auctionEnd, "Auction ended");
    // place bid
}
```

**pod network**: `block.timestamp` is **validator-local** - each validator has different time.

**Fix**: Use pod time utilities

```solidity
import { requireTimeBefore } from "pod-sdk/Time.sol";

function bid() public payable {
    requireTimeBefore(auctionEnd);  // Accounts for validator time variance
    // place bid
}
```

---

### ❌ `block.coinbase`, `block.difficulty`, `block.basefee`

**pod network**: All **always return 0** (no blocks = no block metadata).

**Fix**: Don't use these fields. For randomness, use off-chain oracle or commit-reveal.

---

### ❌ Block Confirmations for Finality

**Ethereum**:

```solidity
// Wait for 12 block confirmations
uint256 confirmations = currentBlock - receipt.blockNumber;
if (confirmations >= 12) { /* finalized */ }
```

**pod network**: No blocks = no block confirmations.

**Fix**: Use attestation count

```javascript
// Check attestations via JSON-RPC
const receipt = await provider.getTransactionReceipt(txHash);
const attestations = receipt.pod_metadata.attestations;
const committeeSize = receipt.pod_metadata.committee_size;
const byzantineThreshold = Math.ceil((committeeSize * 2) / 3);

if (attestations >= byzantineThreshold) {
  // Finalized! (~150ms on pod network)
}
```

---

## Order-Dependent Pattern Breaking Changes

### ❌ Traditional ERC20 `transfer()`

**Ethereum**:

```solidity
mapping(address => uint256) public balances;

function transfer(address to, uint256 amount) public {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    balances[msg.sender] -= amount;
    balances[to] += amount;
}
```

**Why it breaks**: Race condition on balance checks.

```
User has 100 tokens, sends two transfers of 100 tokens:
Validator A: transfer1, transfer2 → First succeeds, second fails
Validator B: transfer2, transfer1 → First succeeds, second fails (different tx!)
❌ Validators disagree on which transfer succeeded
```

**Fix**: Use Balance FastType

```solidity
import { Balance } from "pod-sdk/FastTypes.sol";

mapping(address => Balance) public balances;

function transfer(address to, uint256 amount) public {
    balances[msg.sender].spend(amount);  // Uses nonce to prevent double-spend
    balances[to].credit(amount);
}
```

---

### ❌ First-Come-First-Served (FCFS) Logic

**Ethereum**:

```solidity
uint256 public slots = 100;

function register() public {
    require(slots > 0, "No slots left");
    registered[msg.sender] = true;
    slots--;
}
```

**Why it breaks**: Different validators see different tx order → different slot allocations.

**Fix Option 1**: Remove FCFS, use time windows

```solidity
import { AddressSet } from "pod-sdk/FastTypes.sol";
import { requireTimeBefore } from "pod-sdk/Time.sol";

AddressSet public registered;
uint256 public registrationDeadline;

function register() public {
    requireTimeBefore(registrationDeadline);
    registered.add(msg.sender);
    // Check slot limit off-chain or in finalization function
}
```

**Fix Option 2**: Use external sequencing (see external-sequencing-patterns.md)

---

### ❌ Traditional Order Book (DEX)

**Ethereum**:

```solidity
struct Order {
    uint256 price;
    uint256 amount;
    uint256 timestamp;
}

Order[] public orderBook;

function placeOrder(uint256 price, uint256 amount) public {
    orderBook.push(Order(price, amount, block.timestamp));
    // Match orders by price-time priority
}
```

**Why it breaks**: Price-time priority requires global ordering.

**Fix**: Requires external sequencing

- Run off-protocol sequencer
- Sequencer orders bids/asks
- Submit ordered batch to pod network
- See `external-sequencing-patterns.md`

---

### ❌ Increment-then-Check Patterns

**Ethereum**:

```solidity
uint256 public counter;

function mint() public {
    counter++;
    require(counter <= MAX_SUPPLY, "Cap exceeded");
    _mint(msg.sender, counter);
}
```

**Why it breaks**: Different validators may increment past MAX_SUPPLY if txs arrive simultaneously.

**Fix**: Use SharedCounter and pre-check

```solidity
import { SharedCounter } from "pod-sdk/FastTypes.sol";

SharedCounter public tokenIds;
uint256 public constant MAX_SUPPLY = 10000;

function mint() public {
    uint256 currentSupply = tokenIds.value();
    require(currentSupply < MAX_SUPPLY, "Cap exceeded");

    uint256 tokenId = currentSupply;
    tokenIds.increment();
    _mint(msg.sender, tokenId);
}
```

**Note**: Still has edge case at MAX_SUPPLY boundary. For exact cap, use external sequencing or accept minor overflow.

---

## State Manipulation Breaking Changes

### ❌ Non-Commutative State Updates

**Ethereum**:

```solidity
uint256 public value;

function updateA() public { value = value * 2; }
function updateB() public { value = value + 10; }

// Order matters: (value * 2) + 10 ≠ (value + 10) * 2
```

**Why it breaks**: Non-commutative operations produce different results based on order.

**Fix**: Make operations commutative or use last-write-wins

```solidity
// Option 1: Commutative ops only
function updateA() public { value += 10; }  // Addition is commutative
function updateB() public { value += 20; }

// Option 2: Last-write-wins (eventual consistency)
mapping(address => uint256) public values;
function setValue(uint256 newValue) public {
    values[msg.sender] = newValue;  // Idempotent, no conflicts
}
```

---

### ❌ Array Push/Pop Operations

**Ethereum**:

```solidity
address[] public users;

function addUser(address user) public {
    users.push(user);
}

function removeUser(uint256 index) public {
    users[index] = users[users.length - 1];
    users.pop();
}
```

**Why it breaks**: Order-dependent array operations.

**Fix**: Use AddressSet or mapping

```solidity
import { AddressSet } from "pod-sdk/FastTypes.sol";

AddressSet public users;

function addUser(address user) public {
    users.add(user);  // Commutative, idempotent
}

// No removal on pod network (unless using external sequencing)
```

---

### ❌ Nonce-Based Access Control

**Ethereum**:

```solidity
uint256 public nonce;
mapping(uint256 => bool) public used;

function execute(uint256 _nonce, bytes calldata data) public {
    require(_nonce == nonce, "Invalid nonce");
    require(!used[_nonce], "Already used");
    nonce++;
    used[_nonce] = true;
    // execute
}
```

**Why it breaks**: Validators may accept different nonces based on order.

**Fix**: Use event IDs instead of sequential nonces

```solidity
import { Uint256Set } from "pod-sdk/FastTypes.sol";

Uint256Set public processedEvents;

function execute(uint256 eventId, bytes calldata data) public {
    require(!processedEvents.contains(eventId), "Already processed");
    processedEvents.add(eventId);
    // execute
}
```

---

## Gas and Transaction Breaking Changes

### ⚠️ Transaction Types

**Ethereum**: Supports legacy, EIP-1559, EIP-2930 transactions.
**pod network**: **Legacy transactions only** (initially).

**Fix**: Use `--legacy` flag with Foundry

```bash
forge create MyContract \
    --rpc-url wss://rpc.testnet-02.midnight.network/ \
    --private-key $PRIVATE_KEY \
    --legacy  # Required for pod network
```

---

### ✅ Gas Estimation (Works!)

**pod network**: `eth_estimateGas` works normally.

---

## Event and Log Breaking Changes

### ⚠️ Log Indexing

**Ethereum**: Logs have `blockNumber` and `blockHash`.
**pod network**: Logs have `blockNumber: 0x1` and `blockHash: 0x0...0`.

**Fix**: Use `transactionHash` + `logIndex` for log identification

```javascript
// Don't:
const logId = `${log.blockHash}-${log.logIndex}`;

// Do:
const logId = `${log.transactionHash}-${log.logIndex}`;
```

---

## Migration Checklist

Use this checklist when porting Ethereum contracts to pod network:

### ✅ Safe Patterns (Work on pod network)

- [ ] Pure functions
- [ ] View functions
- [ ] Event emissions
- [ ] Mappings with address keys
- [ ] Simple value storage (`someValue[key] = value`)
- [ ] Arithmetic operations (if commutative)

### ❌ Unsafe Patterns (Break on pod network)

- [ ] `block.number` usage
- [ ] `block.timestamp` for consensus
- [ ] `block.coinbase`, `block.difficulty`, `block.basefee`
- [ ] Order-dependent logic (FCFS, queues, order books)
- [ ] Traditional ERC20 transfers
- [ ] Array push/pop
- [ ] Increment-then-check patterns
- [ ] Sequential nonces for access control
- [ ] Non-commutative state updates
- [ ] Any race conditions

### 🔧 Migration Steps

1. [ ] Replace block fields with alternatives (SharedCounter, time utilities)
2. [ ] Replace balance tracking with Balance FastType
3. [ ] Replace arrays with FastType sets
4. [ ] Replace nonces with event IDs
5. [ ] Test commutativity (use `test-commutativity.js`)
6. [ ] Add external sequencing if order-dependence unavoidable
7. [ ] Update tests for attestation-based finality
8. [ ] Use `--legacy` transaction format

---

## When to Use External Sequencing

If your application **inherently requires** strict transaction ordering, use external sequencing:

**Examples**:

- DEX order books
- Auction with price-time priority
- FIFO job queues
- MEV-sensitive operations
- Strict rate limiting

See `external-sequencing-patterns.md` for implementation.

---

## Testing Your Migration

```bash
# 1. Test commutativity
node test-commutativity.js --explain

# 2. Deploy to pod network dev
forge create MyContract \
    --rpc-url wss://rpc.testnet-02.midnight.network/ \
    --private-key $PRIVATE_KEY \
    --legacy

# 3. Check finality
node check-attestations.js <txHash>

# 4. Test with concurrent transactions
# Submit multiple txs simultaneously and verify convergence
```

---

## Resources

- **pod SDK**: https://docs.v1.pod.network/solidity-sdk
- **FastTypes Guide**: See `fasttypes-guide.md`
- **Coordination-Free Primer**: See `coordination-free-primer.md`
- **External Sequencing**: See `external-sequencing-patterns.md`

---

## Summary

| Pattern           | Ethereum   | pod network Fix                                    |
| ----------------- | ---------- | -------------------------------------------------- |
| Block numbers     | Sequential | ❌ Always 0 → Use SharedCounter or attestations    |
| Block timestamp   | Consensus  | ❌ Validator-local → Use time utilities            |
| ERC20 transfer    | Race-free  | ❌ Breaks → Use Balance FastType                   |
| FCFS allocation   | Sequential | ❌ Breaks → Remove FCFS or use external sequencing |
| Order book        | Ordered    | ❌ Breaks → Use external sequencing                |
| Arrays            | Push/pop   | ❌ Breaks → Use FastType sets                      |
| Increment counter | Simple     | ⚠️ Use SharedCounter                               |
| Set value         | Simple     | ✅ Works (last-write-wins)                         |

**Golden Rule**: If execution order matters, it breaks on pod network (unless you add external sequencing).

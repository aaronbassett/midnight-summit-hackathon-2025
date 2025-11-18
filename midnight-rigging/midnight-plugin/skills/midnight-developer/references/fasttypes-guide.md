# pod SDK FastTypes: Complete Reference Guide

FastTypes are **CRDT-based data structures** (Conflict-free Replicated Data Types) designed for pod network's coordination-free execution model. They guarantee correct behavior regardless of transaction order.

## Installation

```bash
forge install podnetwork/pod-sdk
```

```solidity
import { SharedCounter } from "pod-sdk/FastTypes.sol";
import { Balance } from "pod-sdk/FastTypes.sol";
import { OwnedCounter } from "pod-sdk/FastTypes.sol";
import { Uint256Set } from "pod-sdk/FastTypes.sol";
import { AddressSet } from "pod-sdk/FastTypes.sol";
```

---

## SharedCounter

**Purpose**: Monotonically increasing counter safe for all users to increment.

**Use Cases**:

- Total supply counters
- Global event counts
- Sequential IDs (when order doesn't matter)
- Vote tallies (using per-voter flags)

### API

```solidity
SharedCounter counter;

// Initialize (in constructor)
counter = new SharedCounter();

// Increment by 1
counter.increment();

// Increment by amount
counter.incrementBy(uint256 amount);

// Read current value
uint256 value = counter.value();
```

### Properties

- ✅ **Monotonic**: Only increases, never decreases
- ✅ **Commutative**: Order of increments doesn't matter
- ✅ **No race conditions**: Safe for concurrent access

### Example: NFT Minting

```solidity
import { SharedCounter } from "pod-sdk/FastTypes.sol";

contract PodNFT {
    SharedCounter public totalSupply;

    function mint(address to) public {
        uint256 tokenId = totalSupply.value();
        _mint(to, tokenId);
        totalSupply.increment();
    }
}
```

### Limitations

- ❌ **No decrement**: Cannot decrease value (would break commutativity)
- ❌ **Not for strict sequencing**: Final order of IDs is unpredictable

---

## Balance

**Purpose**: Token balance that supports credits (anyone) and spends (owner only).

**Use Cases**:

- ERC20-like token balances
- Point systems
- Credit/debit accounting
- Escrow balances

### API

```solidity
Balance balance;

// Initialize
balance = new Balance();

// Credit (anyone can add)
balance.credit(uint256 amount);

// Spend (only works for owner, uses nonce)
balance.spend(uint256 amount);

// Read current value
uint256 value = balance.value();
```

### Properties

- ✅ **Credit is commutative**: Anyone can credit, order doesn't matter
- ✅ **Spend is safe**: Uses monotonic nonce internally to prevent double-spend
- ✅ **No race conditions**: Prevents double-spend across validators

### Example: ERC20-like Token

```solidity
import { Balance } from "pod-sdk/FastTypes.sol";

contract PodToken {
    mapping(address => Balance) public balances;

    function transfer(address to, uint256 amount) public {
        balances[msg.sender].spend(amount);
        balances[to].credit(amount);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        balances[to].credit(amount);
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account].value();
    }
}
```

### How Spend Prevents Double-Spend

```solidity
// Internally, Balance uses a nonce:
struct Balance {
    uint256 value;
    uint256 nonce;  // Monotonically increasing
}

function spend(uint256 amount) {
    require(value >= amount, "Insufficient balance");
    value -= amount;
    nonce++;  // Prevents replay
}
```

**Why this works:**

- Even if validators process spends in different orders, the nonce ensures idempotency
- Each spend increments the nonce, making replays detectable

### Limitations

- ⚠️ **Spends must be from owner**: Balance is owned by the address that created it
- ⚠️ **No allowances**: For delegation, use separate approval tracking

---

## OwnedCounter

**Purpose**: Per-address counters where each user owns their own keys.

**Use Cases**:

- Per-user scores/points
- Per-user action counts
- Leaderboards
- Achievement systems

### API

```solidity
OwnedCounter counter;

// Initialize
counter = new OwnedCounter();

// Increment own key
counter.increment(address owner, bytes32 key);

// Increment by amount
counter.incrementBy(address owner, bytes32 key, uint256 amount);

// Decrement own key (only owner can decrement their keys)
counter.decrement(address owner, bytes32 key);

// Decrement by amount
counter.decrementBy(address owner, bytes32 key, uint256 amount);

// Read value
uint256 value = counter.value(address owner, bytes32 key);
```

### Properties

- ✅ **Per-user isolation**: Each address owns its own set of keys
- ✅ **Safe increment**: Anyone can increment any key
- ✅ **Safe decrement**: Only owner can decrement their own keys
- ✅ **No conflicts**: Different users never conflict

### Example: Game Scoring System

```solidity
import { OwnedCounter } from "pod-sdk/FastTypes.sol";

contract PodGame {
    OwnedCounter public scores;

    bytes32 constant WINS = keccak256("wins");
    bytes32 constant LOSSES = keccak256("losses");

    function recordWin(address player) public {
        scores.increment(player, WINS);
    }

    function recordLoss(address player) public {
        scores.increment(player, LOSSES);
    }

    function adjustScore(bytes32 category, int256 delta) public {
        if (delta > 0) {
            scores.incrementBy(msg.sender, category, uint256(delta));
        } else {
            scores.decrementBy(msg.sender, category, uint256(-delta));
        }
    }

    function getWins(address player) public view returns (uint256) {
        return scores.value(player, WINS);
    }
}
```

### Why Decrement is Safe

```solidity
// Decrement is safe because:
// 1. Only owner can decrement their keys
// 2. No cross-user conflicts
// 3. Uses nonce per (owner, key) pair

function decrement(address owner, bytes32 key) {
    require(msg.sender == owner, "Not owner");
    // Each (owner, key) is isolated
    counters[owner][key].value--;
    counters[owner][key].nonce++;
}
```

### Limitations

- ⚠️ **Only owner can decrement**: Cannot decrement other users' keys
- ⚠️ **Key management**: Need to define key constants

---

## Uint256Set

**Purpose**: Add-only set of uint256 values.

**Use Cases**:

- Tracking used token IDs
- Recording processed event IDs
- Maintaining allow lists
- Storing unique identifiers

### API

```solidity
Uint256Set set;

// Initialize
set = new Uint256Set();

// Add item (idempotent)
set.add(uint256 item);

// Check if contains
bool exists = set.contains(uint256 item);

// Get size
uint256 size = set.size();

// Iterate (gas-intensive, avoid in transactions)
uint256[] memory items = set.values();
```

### Properties

- ✅ **Add-only**: Items can be added but never removed
- ✅ **Idempotent**: Adding same item twice is safe
- ✅ **Commutative**: Order of adds doesn't matter

### Example: Processed Events

```solidity
import { Uint256Set } from "pod-sdk/FastTypes.sol";

contract EventProcessor {
    Uint256Set public processedEvents;

    function processEvent(uint256 eventId) public {
        require(!processedEvents.contains(eventId), "Already processed");
        processedEvents.add(eventId);
        // ... process event
    }
}
```

### Limitations

- ❌ **No removal**: Cannot remove items (would break commutativity)
- ⚠️ **Gas cost**: Iteration can be expensive for large sets

---

## AddressSet

**Purpose**: Add-only set of addresses.

**Use Cases**:

- Voter registration
- Participant tracking
- Access control lists
- Staking participants

### API

```solidity
AddressSet set;

// Initialize
set = new AddressSet();

// Add address (idempotent)
set.add(address addr);

// Check if contains
bool exists = set.contains(address addr);

// Get size
uint256 size = set.size();

// Iterate
address[] memory addresses = set.values();
```

### Properties

- ✅ **Add-only**: Addresses can be added but never removed
- ✅ **Idempotent**: Adding same address twice is safe
- ✅ **Commutative**: Order of adds doesn't matter

### Example: Voting System

```solidity
import { AddressSet } from "pod-sdk/FastTypes.sol";
import { SharedCounter } from "pod-sdk/FastTypes.sol";

contract PodVoting {
    AddressSet public voters;
    SharedCounter public yesVotes;
    SharedCounter public noVotes;

    mapping(address => bool) public hasVoted;

    function vote(bool support) public {
        require(!hasVoted[msg.sender], "Already voted");

        hasVoted[msg.sender] = true;
        voters.add(msg.sender);

        if (support) {
            yesVotes.increment();
        } else {
            noVotes.increment();
        }
    }

    function totalVoters() public view returns (uint256) {
        return voters.size();
    }
}
```

### Limitations

- ❌ **No removal**: Cannot remove addresses
- ⚠️ **Gas cost**: Iteration expensive for large sets

---

## Time Utilities

pod network provides time-based utilities that account for validator-local clocks.

```solidity
import { requireTimeAfter, requireTimeBefore } from "pod-sdk/Time.sol";

function claim() public {
    requireTimeAfter(claimStartTime);  // Must be after start
    requireTimeBefore(claimEndTime);   // Must be before end
    // ... claim logic
}
```

### How Time Works on pod network

- ⚠️ **`block.timestamp` is validator-local** - Each validator uses its own clock
- ✅ **`requireTimeAfter/Before` accounts for variance** - Requires supermajority agreement
- ⚠️ **Not consensus-based** - Time is advisory, not authoritative

**Best Practice**: Use time for soft deadlines (auctions, voting), not for consensus-critical logic.

---

## Design Patterns

### Pattern: Token with Supply Cap

```solidity
contract CappedToken {
    SharedCounter public totalSupply;
    mapping(address => Balance) public balances;
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;

    function mint(address to, uint256 amount) public {
        require(totalSupply.value() + amount <= MAX_SUPPLY, "Cap exceeded");
        totalSupply.incrementBy(amount);
        balances[to].credit(amount);
    }
}
```

### Pattern: Achievement System

```solidity
contract Achievements {
    OwnedCounter public progress;
    AddressSet public achievers;

    bytes32 constant ACHIEVEMENT_X = keccak256("achievement_x");
    uint256 constant THRESHOLD = 100;

    function recordProgress(address user) public {
        progress.increment(user, ACHIEVEMENT_X);

        if (progress.value(user, ACHIEVEMENT_X) >= THRESHOLD) {
            achievers.add(user);
        }
    }
}
```

### Pattern: Idempotent Event Processing

```solidity
contract EventHandler {
    Uint256Set public processedEvents;
    SharedCounter public totalProcessed;

    function handleEvent(uint256 eventId, bytes calldata data) public {
        require(!processedEvents.contains(eventId), "Already processed");
        processedEvents.add(eventId);
        totalProcessed.increment();

        // ... process event
    }
}
```

---

## Common Mistakes

### ❌ Mistake 1: Using Regular Variables

```solidity
// DON'T:
uint256 public counter;
function increment() public { counter++; }

// DO:
SharedCounter public counter;
function increment() public { counter.increment(); }
```

### ❌ Mistake 2: Trying to Remove from Sets

```solidity
// DON'T (won't compile):
addressSet.remove(someAddress);  // No remove() method

// DO: Design around add-only
// Use flags or expired timestamps instead
```

### ❌ Mistake 3: Forgetting Balance Ownership

```solidity
// DON'T:
Balance globalBalance;
function spend(address from, uint256 amount) public {
    globalBalance.spend(amount);  // Only owner can spend!
}

// DO:
mapping(address => Balance) balances;
function spend(uint256 amount) public {
    balances[msg.sender].spend(amount);  // msg.sender owns their balance
}
```

---

## Performance Considerations

- **Storage costs**: FastTypes use similar gas to regular storage
- **Iteration**: Avoid iterating sets in transactions (use off-chain indexing)
- **Nonces**: Balance and OwnedCounter use nonces internally (minor gas overhead)

---

## Resources

- **pod SDK Docs**: https://docs.v1.pod.network/solidity-sdk
- **Examples**: https://docs.v1.pod.network/examples/
- **CRDT Theory**: https://crdt.tech/

---

## Summary

| FastType      | Increment          | Decrement             | Remove         | Use Case             |
| ------------- | ------------------ | --------------------- | -------------- | -------------------- |
| SharedCounter | ✅ Anyone          | ❌ Not allowed        | N/A            | Global counters, IDs |
| Balance       | ✅ Anyone (credit) | ✅ Owner only (spend) | N/A            | Token balances       |
| OwnedCounter  | ✅ Anyone          | ✅ Owner only         | N/A            | Per-user scores      |
| Uint256Set    | ✅ Anyone          | N/A                   | ❌ Not allowed | Processed IDs        |
| AddressSet    | ✅ Anyone          | N/A                   | ❌ Not allowed | Voter lists          |

**Golden Rule**: If you need removal or arbitrary decrement, use external sequencing or redesign with FastTypes.

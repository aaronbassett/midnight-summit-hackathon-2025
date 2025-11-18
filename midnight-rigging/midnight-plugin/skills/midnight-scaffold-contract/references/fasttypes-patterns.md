# FastTypes Patterns and Best Practices

Comprehensive patterns for using pod SDK FastTypes in smart contracts.

## Pattern Categories

### 1. Counter Patterns

#### Simple Global Counter

**Use case**: Total supply, event counts, sequential IDs

```solidity
import { SharedCounter } from "pod-sdk/FastTypes.sol";

contract SupplyTracker {
    SharedCounter public totalMinted;

    function mint() public {
        uint256 id = totalMinted.value();
        totalMinted.increment();
        // use id...
    }
}
```

#### Per-User Counter

**Use case**: User scores, action counts, achievements

```solidity
import { OwnedCounter } from "pod-sdk/FastTypes.sol";

contract UserStats {
    OwnedCounter public stats;

    bytes32 constant POSTS = keccak256("posts");
    bytes32 constant LIKES = keccak256("likes");

    function recordPost(address user) public {
        stats.increment(user, POSTS);
    }

    function recordLike(address user) public {
        stats.increment(user, LIKES);
    }
}
```

#### Multi-Category Counter

**Use case**: Different types of events or metrics

```solidity
mapping(bytes32 => SharedCounter) public categoryCounters;

function incrementCategory(bytes32 category) public {
    if (address(categoryCounters[category]) == address(0)) {
        categoryCounters[category] = new SharedCounter();
    }
    categoryCounters[category].increment();
}
```

---

### 2. Balance Patterns

#### Token Balance

**Use case**: ERC20-style tokens, credits, points

```solidity
import { Balance } from "pod-sdk/FastTypes.sol";

contract Token {
    mapping(address => Balance) public balances;

    function transfer(address to, uint256 amount) public {
        balances[msg.sender].spend(amount);
        balances[to].credit(amount);
    }
}
```

#### Escrow with Balances

**Use case**: Holding funds until conditions are met

```solidity
contract Escrow {
    mapping(bytes32 => Balance) public escrowBalances;
    mapping(bytes32 => address) public beneficiaries;

    function deposit(bytes32 escrowId) public payable {
        escrowBalances[escrowId].credit(msg.value);
    }

    function release(bytes32 escrowId) public {
        address beneficiary = beneficiaries[escrowId];
        uint256 amount = escrowBalances[escrowId].value();

        escrowBalances[escrowId].spend(amount);

        (bool success, ) = beneficiary.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

#### Multi-Currency Balance

**Use case**: Multiple token types per user

```solidity
mapping(address => mapping(bytes32 => Balance)) public multiBalances;

bytes32 constant CURRENCY_A = keccak256("CURRENCY_A");
bytes32 constant CURRENCY_B = keccak256("CURRENCY_B");

function transferCurrency(bytes32 currency, address to, uint256 amount) public {
    multiBalances[msg.sender][currency].spend(amount);
    multiBalances[to][currency].credit(amount);
}
```

---

### 3. Set Patterns

#### Voter Registration

**Use case**: Track unique participants

```solidity
import { AddressSet } from "pod-sdk/FastTypes.sol";

contract VoterRegistry {
    AddressSet public registeredVoters;
    mapping(address => bool) public hasRegistered;

    function register() public {
        require(!hasRegistered[msg.sender], "Already registered");
        hasRegistered[msg.sender] = true;
        registeredVoters.add(msg.sender);
    }
}
```

#### Access Control List

**Use case**: Whitelist, allowed addresses

```solidity
AddressSet public allowlist;

modifier onlyAllowed() {
    require(allowlist.contains(msg.sender), "Not allowed");
    _;
}

function addToAllowlist(address addr) public onlyOwner {
    allowlist.add(addr);
}
```

#### Event Deduplication

**Use case**: Prevent processing same event twice

```solidity
import { Uint256Set } from "pod-sdk/FastTypes.sol";

contract EventProcessor {
    Uint256Set public processedEvents;

    function processEvent(uint256 eventId) public {
        require(!processedEvents.contains(eventId), "Already processed");
        processedEvents.add(eventId);

        // process event...
    }
}
```

---

### 4. Time-Based Patterns

#### Time-Locked Actions

**Use case**: Deadlines, time windows, vesting

```solidity
import { requireTimeAfter, requireTimeBefore } from "pod-sdk/Time.sol";

contract TimeLocked {
    uint256 public unlockTime;

    function claimAfterUnlock() public {
        requireTimeAfter(unlockTime);
        // claim logic...
    }

    function actBeforeDeadline(uint256 deadline) public {
        requireTimeBefore(deadline);
        // action logic...
    }
}
```

#### Voting Period

**Use case**: Time-bounded participation

```solidity
uint256 public votingStart;
uint256 public votingEnd;

function vote() public {
    requireTimeAfter(votingStart);
    requireTimeBefore(votingEnd);
    // voting logic...
}
```

#### Phased Operations

**Use case**: Multi-phase processes (presale, public sale, claiming)

```solidity
uint256 public presaleStart;
uint256 public presaleEnd;
uint256 public publicSaleStart;
uint256 public publicSaleEnd;

function presaleMint() public {
    requireTimeAfter(presaleStart);
    requireTimeBefore(presaleEnd);
    // presale logic...
}

function publicMint() public {
    requireTimeAfter(publicSaleStart);
    requireTimeBefore(publicSaleEnd);
    // public sale logic...
}
```

---

### 5. Combined Patterns

#### Voting with Balances

**Use case**: Token-weighted voting

```solidity
import { AddressSet } from "pod-sdk/FastTypes.sol";
import { SharedCounter } from "pod-sdk/FastTypes.sol";
import { Balance } from "pod-sdk/FastTypes.sol";

contract TokenWeightedVoting {
    AddressSet public voters;
    SharedCounter public totalVoteWeight;
    mapping(address => Balance) public votingPower;
    mapping(address => bool) public hasVoted;

    function vote(uint256 weight) public {
        require(!hasVoted[msg.sender], "Already voted");
        require(votingPower[msg.sender].value() >= weight, "Insufficient power");

        hasVoted[msg.sender] = true;
        voters.add(msg.sender);
        votingPower[msg.sender].spend(weight);
        totalVoteWeight.incrementBy(weight);
    }
}
```

#### NFT with Metadata Tracking

**Use case**: NFTs with on-chain attributes

```solidity
import { SharedCounter } from "pod-sdk/FastTypes.sol";
import { OwnedCounter } from "pod-sdk/FastTypes.sol";

contract AttributeNFT {
    SharedCounter public totalSupply;
    mapping(uint256 => address) public owners;

    OwnedCounter public attributes; // Per-NFT attributes

    bytes32 constant LEVEL = keccak256("level");
    bytes32 constant EXPERIENCE = keccak256("experience");

    function mint(address to) public returns (uint256) {
        uint256 tokenId = totalSupply.value();
        totalSupply.increment();
        owners[tokenId] = to;

        // Initialize attributes
        attributes.incrementBy(address(uint160(tokenId)), LEVEL, 1);

        return tokenId;
    }

    function gainExperience(uint256 tokenId, uint256 amount) public {
        require(owners[tokenId] == msg.sender, "Not owner");
        attributes.incrementBy(address(uint160(tokenId)), EXPERIENCE, amount);

        // Level up logic
        uint256 exp = attributes.value(address(uint160(tokenId)), EXPERIENCE);
        if (exp >= 100) {
            attributes.increment(address(uint160(tokenId)), LEVEL);
        }
    }
}
```

#### Staking with Rewards

**Use case**: Token staking with accumulated rewards

```solidity
import { Balance } from "pod-sdk/FastTypes.sol";
import { SharedCounter } from "pod-sdk/FastTypes.sol";

contract StakingRewards {
    mapping(address => Balance) public stakedBalances;
    mapping(address => Balance) public rewardBalances;
    SharedCounter public totalStaked;

    function stake(uint256 amount) public {
        stakedBalances[msg.sender].credit(amount);
        totalStaked.incrementBy(amount);
    }

    function distributeRewards(uint256 totalRewards) public {
        // Simplified: distribute proportionally (in practice, use more sophisticated logic)
        // This is a placeholder - actual distribution would be more complex
    }

    function claimRewards() public {
        uint256 rewards = rewardBalances[msg.sender].value();
        rewardBalances[msg.sender].spend(rewards);

        // Transfer rewards...
    }

    function unstake(uint256 amount) public {
        stakedBalances[msg.sender].spend(amount);
        // Transfer staked tokens back...
    }
}
```

---

## Anti-Patterns to Avoid

### ❌ Using Regular Variables for Shared State

```solidity
// DON'T:
uint256 public counter;
function increment() { counter++; }  // Race condition!

// DO:
SharedCounter public counter;
function increment() { counter.increment(); }
```

### ❌ Trying to Decrement SharedCounter

```solidity
// DON'T:
SharedCounter public supply;
supply.decrement();  // Doesn't exist!

// DO: Use Balance if you need both directions
Balance public supply;
supply.credit(amount);  // Increase
supply.spend(amount);   // Decrease (only owner)
```

### ❌ Removing from Sets

```solidity
// DON'T:
AddressSet public members;
members.remove(addr);  // Doesn't exist!

// DO: Use flags or timestamps
mapping(address => bool) public isActive;
AddressSet public allMembers;  // Never removed

function deactivate(address addr) {
    isActive[addr] = false;
}
```

### ❌ Using block.timestamp for Consensus

```solidity
// DON'T:
require(block.timestamp > deadline, "Too early");  // Validator-local!

// DO: Use time utilities
requireTimeAfter(deadline);  // Consensus-based
```

### ❌ Order-Dependent Logic

```solidity
// DON'T:
if (bids[msg.sender] > highestBid) {
    highestBid = bids[msg.sender];  // Non-commutative!
}

// DO: Use last-write-wins or external sequencing
```

---

## Best Practices

### 1. Initialize FastTypes in Constructor

```solidity
constructor() {
    counter = new SharedCounter();
    voters = new AddressSet();
}
```

### 2. Always Check Existence Before Operations

```solidity
require(!voters.contains(msg.sender), "Already voted");
voters.add(msg.sender);
```

### 3. Use Idempotent Flags

```solidity
mapping(address => bool) public hasProcessed;

function process() public {
    require(!hasProcessed[msg.sender], "Already processed");
    hasProcessed[msg.sender] = true;
    // process...
}
```

### 4. Combine FastTypes for Complex State

```solidity
AddressSet public voters;          // Who voted
SharedCounter public yesVotes;     // Yes count
SharedCounter public noVotes;      // No count
mapping(address => bool) hasVoted; // Idempotency
```

### 5. Use Time Buffers

```solidity
uint256 constant TIME_BUFFER = 5 seconds;
uint256 public deadline = block.timestamp + 1 hours + TIME_BUFFER;
```

### 6. Emit Events for State Changes

```solidity
event CounterIncremented(uint256 newValue);

function increment() public {
    counter.increment();
    emit CounterIncremented(counter.value());
}
```

---

## Performance Considerations

### Gas Costs

- FastTypes have similar gas costs to regular storage
- Set iteration is expensive - avoid in transactions
- Use off-chain indexing for set queries

### Storage Layout

```solidity
// Good: Group related FastTypes
SharedCounter public counter1;
SharedCounter public counter2;
mapping(address => Balance) public balances;

// Avoid: Sparse FastType usage
```

### View Functions

```solidity
// Free to call (no gas)
function getCount() public view returns (uint256) {
    return counter.value();
}

function hasVoted(address addr) public view returns (bool) {
    return voters.contains(addr);
}
```

---

## Testing Patterns

### Test Commutativity

```javascript
// Test: Operations work in any order
await contract.increment();
await contract.vote();

// vs

await contract.vote();
await contract.increment();

// Both should produce same final state
```

### Test Concurrency

```javascript
// Simulate concurrent operations
const tx1 = contract.increment();
const tx2 = contract.increment();
await Promise.all([tx1, tx2]);

// Verify final state is correct
```

### Test Time Boundaries

```javascript
// Before start time
await expect(contract.vote()).to.be.revertedWith('Too early');

// Fast forward
await time.increaseTo(votingStart + 1);

// During voting period
await contract.vote();

// After end time
await time.increaseTo(votingEnd + 1);
await expect(contract.vote()).to.be.revertedWith('Too late');
```

---

## Resources

- **pod SDK Documentation**: https://docs.v1.pod.network/solidity-sdk
- **FastTypes Reference**: See `fasttypes-guide.md` in midnight-developer skill
- **Examples**: https://docs.v1.pod.network/examples/
- **CRDT Theory**: https://crdt.tech/

---

## Quick Reference

| Pattern         | FastTypes                  | Key Feature               |
| --------------- | -------------------------- | ------------------------- |
| Global counter  | SharedCounter              | Monotonic increment       |
| Token balance   | Balance                    | Credit/spend with nonce   |
| Per-user scores | OwnedCounter               | Owner-isolated counters   |
| Voter list      | AddressSet                 | Add-only membership       |
| Event tracking  | Uint256Set                 | Deduplication             |
| Time locks      | Time utilities             | Consensus time checks     |
| Voting          | AddressSet + SharedCounter | Idempotent participation  |
| Auction         | Balance + Time             | Order-independent bidding |

**Remember**: If you need removal or arbitrary decrement, redesign with FastTypes or use external sequencing.

# Time-Based Logic on pod network

How to safely use time in pod network's coordination-free architecture where each validator has its own clock.

## The Core Challenge

**Ethereum**: `block.timestamp` is **consensus-based** - all validators agree on the same timestamp for each block.

**pod network**: `block.timestamp` is **validator-local** - each validator uses its own clock, and clocks may drift.

**Implication**: Time-based logic cannot rely on globally agreed timestamps.

---

## How Time Works on pod network

### Validator-Local Clocks

```
Validator A clock: 2024-01-15 10:00:00.123
Validator B clock: 2024-01-15 10:00:00.891  (768ms drift)
Validator C clock: 2024-01-15 09:59:59.456  (667ms behind)
```

**Each validator**:

- Uses its own system clock
- May have clock drift (NTP helps but doesn't guarantee perfect sync)
- Processes transactions with its local timestamp

### What This Means for Your Contract

```solidity
// This returns DIFFERENT values on different validators!
uint256 timestamp = block.timestamp;
```

**Example Problem**:

```solidity
function claimReward() public {
    require(block.timestamp >= rewardTime, "Too early");
    // Transfer reward
}

// Validator A (clock: 10:00:00.123) → Transaction succeeds
// Validator B (clock: 09:59:59.890) → Transaction fails
// ❌ Validators disagree!
```

---

## Solution: pod SDK Time Utilities

pod network provides time functions that account for validator clock variance.

### Import Time Utilities

```solidity
import { requireTimeAfter, requireTimeBefore } from "pod-sdk/Time.sol";
```

### `requireTimeAfter(uint256 timestamp)`

Requires that a **supermajority** of validators agree the time has passed.

```solidity
function startAuction() public {
    requireTimeAfter(auctionStartTime);
    // ... auction logic
}
```

**How it works**:

- Each validator checks: `block.timestamp >= timestamp - TOLERANCE`
- Tolerance accounts for expected clock drift
- Requires >2/3 attestations for transaction to be considered valid
- If not enough validators agree, transaction is rejected

**Result**: Transaction only finalizes if supermajority of validators agree time has passed.

### `requireTimeBefore(uint256 timestamp)`

Requires that a **supermajority** of validators agree the time has NOT passed yet.

```solidity
function placeBid() public payable {
    requireTimeBefore(auctionEndTime);
    // ... bid logic
}
```

**How it works**:

- Each validator checks: `block.timestamp < timestamp + TOLERANCE`
- Requires >2/3 attestations
- Ensures transaction only succeeds if supermajority agrees deadline hasn't passed

---

## Time Tolerance and Edge Cases

### Tolerance Window

```
auctionEndTime = 10:00:00

Validator A (09:59:59): Still open ✅
Validator B (10:00:00): Closed ❌
Validator C (10:00:01): Closed ❌

With tolerance (~1-2 seconds):
All validators in [09:59:59, 10:00:01] agree on "closed" status
```

**Edge Case**: Transactions submitted exactly at boundary may be rejected by some validators.

**Best Practice**: Add buffer to your deadlines:

```solidity
uint256 public auctionEnd = now + 1 hours + 5 seconds;  // 5s buffer
```

---

## Common Time-Based Patterns

### Pattern 1: Time-Windowed Actions

```solidity
import { requireTimeAfter, requireTimeBefore } from "pod-sdk/Time.sol";

contract TimedEvent {
    uint256 public eventStart;
    uint256 public eventEnd;

    function participate() public {
        requireTimeAfter(eventStart);   // After start
        requireTimeBefore(eventEnd);     // Before end
        // ... participation logic
    }
}
```

**Use Cases**:

- Voting windows
- Registration periods
- Sale events
- Auctions

---

### Pattern 2: Deadline-Based Actions

```solidity
import { requireTimeBefore } from "pod-sdk/Time.sol";

contract Crowdfunding {
    uint256 public deadline;

    function contribute() public payable {
        requireTimeBefore(deadline);
        // ... contribution logic
    }

    function claim() public {
        requireTimeAfter(deadline);
        // ... claim logic
    }
}
```

---

### Pattern 3: Cooldown Periods

```solidity
import { requireTimeAfter } from "pod-sdk/Time.sol";

contract RateLimited {
    mapping(address => uint256) public lastAction;
    uint256 public constant COOLDOWN = 1 hours;

    function performAction() public {
        requireTimeAfter(lastAction[msg.sender] + COOLDOWN);
        lastAction[msg.sender] = block.timestamp;
        // ... action logic
    }
}
```

**Note**: `lastAction` is set to validator-local time, but `requireTimeAfter` handles variance.

---

### Pattern 4: Vesting Schedules

```solidity
import { requireTimeAfter } from "pod-sdk/Time.sol";
import { Balance } from "pod-sdk/FastTypes.sol";

contract Vesting {
    struct VestingSchedule {
        uint256 startTime;
        uint256 duration;
        Balance total;
        Balance claimed;
    }

    mapping(address => VestingSchedule) public schedules;

    function claim() public {
        VestingSchedule storage schedule = schedules[msg.sender];

        requireTimeAfter(schedule.startTime);

        uint256 elapsed = block.timestamp - schedule.startTime;
        uint256 vested = (schedule.total.value() * elapsed) / schedule.duration;

        uint256 claimable = vested - schedule.claimed.value();
        schedule.claimed.credit(claimable);

        // ... transfer tokens
    }
}
```

---

## What NOT to Do

### ❌ Don't Use block.timestamp for Consensus

```solidity
// DON'T: Validators will disagree
function checkDeadline() public view returns (bool) {
    return block.timestamp < deadline;
}

// DO: Use time utilities
function checkDeadline() public {
    requireTimeBefore(deadline);
}
```

### ❌ Don't Use Exact Timestamp Comparisons

```solidity
// DON'T: Edge case issues
require(block.timestamp == exactTime, "Wrong time");

// DO: Use time windows
requireTimeAfter(exactTime);
requireTimeBefore(exactTime + 1 minutes);
```

### ❌ Don't Rely on Precise Timing

```solidity
// DON'T: Validator clocks may differ by seconds
uint256 roundDuration = 100 milliseconds;  // Too precise!

// DO: Use reasonable windows (minutes/hours)
uint256 roundDuration = 5 minutes;  // Validators can agree
```

---

## Time Granularity Recommendations

| Use Case                 | Recommended Granularity | Example              |
| ------------------------ | ----------------------- | -------------------- |
| High-frequency actions   | ≥ 1 minute              | Trading rounds       |
| Medium-frequency actions | ≥ 1 hour                | Auction phases       |
| Low-frequency actions    | ≥ 1 day                 | Voting periods       |
| Very rare actions        | ≥ 1 week                | Governance proposals |

**Rule of Thumb**: Allow at least 5-10 seconds of tolerance for edge cases.

---

## Block Numbers Are Always 0

Remember: `block.number` is **always 0** on pod network.

### ❌ Don't Use Block Numbers

```solidity
// DON'T: block.number is always 0
uint256 blocksUntilEnd = deadline - block.number;

// DO: Use time
uint256 secondsUntilEnd = deadline - block.timestamp;
```

### ❌ Don't Count Blocks

```solidity
// DON'T: No blocks to count
uint256 confirmations = currentBlock - txBlock;

// DO: Use attestations
uint256 attestations = receipt.pod_metadata.attestations;
```

---

## Testing Time-Based Logic

### Foundry Tests

```solidity
contract TimeTest is Test {
    TimedContract contract;

    function setUp() public {
        contract = new TimedContract();
    }

    function testAfterDeadline() public {
        // Set time to after deadline
        vm.warp(contract.deadline() + 1);

        // Should allow action
        contract.performAction();
    }

    function testBeforeDeadline() public {
        // Set time to before deadline
        vm.warp(contract.deadline() - 1);

        // Should revert
        vm.expectRevert();
        contract.performAction();
    }
}
```

### Local Testing Tips

- Use `vm.warp()` to set blockchain time
- Test both sides of time boundaries
- Add buffer tests (deadline ± tolerance)
- Test with multiple simulated validators (different clocks)

---

## Advanced: Custom Time Logic

If you need custom time-based logic, follow these principles:

### Principle 1: Use Time Ranges, Not Points

```solidity
// DON'T: Exact time
require(block.timestamp == targetTime, "Wrong time");

// DO: Time range
require(
    block.timestamp >= targetTime - TOLERANCE &&
    block.timestamp <= targetTime + TOLERANCE,
    "Outside window"
);
```

### Principle 2: Make Time-Dependent Operations Idempotent

```solidity
// DON'T: Non-idempotent
function dailyReward() public {
    require(block.timestamp > lastReward + 1 days, "Too soon");
    lastReward = block.timestamp;  // Different validators set different times!
    // ... reward logic
}

// DO: Idempotent with day counter
function dailyReward() public {
    uint256 day = block.timestamp / 1 days;
    require(day > claimedDay[msg.sender], "Already claimed");
    claimedDay[msg.sender] = day;
    // ... reward logic
}
```

### Principle 3: Accept Eventual Consistency

```solidity
// Accept that validators may temporarily disagree
// As long as they converge to same final state

mapping(address => uint256) public lastUpdate;

function updateValue(uint256 value) public {
    // Last write wins (eventual consistency)
    if (block.timestamp > lastUpdate[msg.sender]) {
        lastUpdate[msg.sender] = block.timestamp;
        values[msg.sender] = value;
    }
}
```

---

## Security Considerations

### Miner/Validator Timestamp Manipulation

**Ethereum**: Miners can manipulate `block.timestamp` by ~15 seconds.

**pod network**: Validators can use any timestamp they want, but:

- Time utilities require >2/3 validator agreement
- Outlier timestamps won't get enough attestations
- Byzantine fault tolerance protects against timestamp attacks

**Best Practice**: Don't rely on sub-second precision.

### Time-Based Attacks

1. **Deadline Griefing**: Attacker floods network at deadline
   - **Mitigation**: Add buffer to deadlines

2. **Clock Drift Exploitation**: Attacker exploits edge cases
   - **Mitigation**: Use time utilities with tolerance

3. **Frontrunning**: Attacker sees time-sensitive tx and frontruns
   - **Mitigation**: Commit-reveal or encrypted mempool

---

## Resources

- **pod SDK**: https://docs.v1.pod.network/solidity-sdk
- **Time Examples**: https://docs.v1.pod.network/examples/voting
- **Coordination-Free Primer**: See `coordination-free-primer.md`

---

## Summary

| Feature              | Ethereum                         | pod network                              |
| -------------------- | -------------------------------- | ---------------------------------------- |
| `block.timestamp`    | Consensus, all validators agree  | Validator-local, may differ              |
| `block.number`       | Sequential, reliable             | Always 0                                 |
| Time precision       | ~15 seconds (miner manipulation) | Use tolerance (5-10 seconds)             |
| Recommended approach | Direct `block.timestamp` checks  | `requireTimeAfter` / `requireTimeBefore` |

**Golden Rules**:

1. Use `requireTimeAfter` and `requireTimeBefore` from pod SDK
2. Add 5-10 second buffers to deadlines
3. Use time ranges, not exact timestamps
4. Accept eventual consistency for time-dependent state
5. Test with clock variance

Time works on pod network, but it's **advisory, not authoritative** - design accordingly!

# Template Customization Guide

Guide for customizing pod network contract templates to fit specific use cases.

## Available Templates

### 1. BasicContract.sol

**Purpose**: Minimal starter template for simple contracts

**What's included**:

- SharedCounter example
- Owner management
- Basic event emissions

**When to use**:

- Starting a new contract from scratch
- Learning pod network development
- Need minimal boilerplate

**Customization points**:

1. Replace `counter` with your own state variables
2. Add custom functions using FastTypes
3. Implement your business logic
4. Add events for important state changes

**Example customizations**:

```solidity
// Replace counter with your logic
// mapping(address => Balance) public userPoints;

// Add custom functions
// function awardPoints(address user, uint256 amount) public onlyOwner {
//     userPoints[user].credit(amount);
// }
```

---

### 2. PodToken.sol

**Purpose**: ERC20-style fungible token with FastTypes

**What's included**:

- Balance FastType for balances
- SharedCounter for total supply
- Transfer, mint, burn functions
- Allowance system

**When to use**:

- Creating fungible tokens (currencies, points, credits)
- Need ERC20-compatible interface
- Want safe transfer logic

**Customization variables**:

```solidity
constructor(
    string memory _name,        // Token name (e.g., "My Token")
    string memory _symbol,      // Token symbol (e.g., "MTK")
    uint8 _decimals,            // Decimals (usually 18)
    uint256 _maxSupply          // Max supply (0 for unlimited)
)
```

**Common customizations**:

**Add minting restrictions**:

```solidity
uint256 public mintingDeadline;

function mint(address to, uint256 amount) public onlyOwner {
    requireTimeBefore(mintingDeadline);
    // ... rest of mint logic
}
```

**Add transfer fees**:

```solidity
uint256 public transferFeePercent = 1; // 1%

function transfer(address to, uint256 amount) public returns (bool) {
    uint256 fee = (amount * transferFeePercent) / 100;
    uint256 netAmount = amount - fee;

    balances[msg.sender].spend(amount);
    balances[to].credit(netAmount);
    balances[owner].credit(fee);

    emit Transfer(msg.sender, to, netAmount);
    return true;
}
```

**Add pausable functionality**:

```solidity
bool public paused;

modifier whenNotPaused() {
    require(!paused, "Contract is paused");
    _;
}

function transfer(address to, uint256 amount) public whenNotPaused returns (bool) {
    // ... transfer logic
}
```

---

### 3. PodNFT.sol

**Purpose**: ERC721-style non-fungible token with FastTypes

**What's included**:

- SharedCounter for token IDs
- Transfer, mint, burn functions
- Approval system (single and operator)

**When to use**:

- Creating NFT collections
- Need unique token tracking
- Want ERC721-compatible interface

**Customization variables**:

```solidity
constructor(
    string memory _name,        // Collection name (e.g., "My NFTs")
    string memory _symbol,      // Collection symbol (e.g., "MNFT")
    uint256 _maxSupply          // Max supply (0 for unlimited)
)
```

**Common customizations**:

**Add metadata URIs**:

```solidity
string public baseURI;
mapping(uint256 => string) public tokenURIs;

function tokenURI(uint256 tokenId) public view returns (string memory) {
    require(owners[tokenId] != address(0), "Token does not exist");
    if (bytes(tokenURIs[tokenId]).length > 0) {
        return tokenURIs[tokenId];
    }
    return string(abi.encodePacked(baseURI, Strings.toString(tokenId)));
}

function setTokenURI(uint256 tokenId, string memory uri) public onlyOwner {
    tokenURIs[tokenId] = uri;
}
```

**Add public minting with payment**:

```solidity
uint256 public mintPrice = 0.1 ether;

function publicMint() public payable returns (uint256) {
    require(msg.value >= mintPrice, "Insufficient payment");

    if (maxSupply > 0) {
        require(totalSupply.value() < maxSupply, "Max supply reached");
    }

    uint256 tokenId = totalSupply.value();
    totalSupply.increment();
    _mint(msg.sender, tokenId);

    return tokenId;
}
```

**Add minting limits per address**:

```solidity
uint256 public maxPerAddress = 10;
mapping(address => uint256) public mintedCount;

function mint(address to) public onlyOwner returns (uint256) {
    require(mintedCount[to] < maxPerAddress, "Max per address reached");

    mintedCount[to]++;

    // ... rest of mint logic
}
```

---

### 4. PodVoting.sol

**Purpose**: Simple voting/proposal system with FastTypes

**What's included**:

- AddressSet for voters
- SharedCounter for vote tallies
- Time-based voting periods
- Idempotent voting logic

**When to use**:

- DAO governance
- Proposal voting systems
- Community decisions
- Polls and surveys

**Customization variables**:

```solidity
constructor(
    string memory _proposalDescription,  // Proposal text
    uint256 _votingDuration              // Duration in seconds
)
```

**Common customizations**:

**Add weighted voting**:

```solidity
import { Balance } from "pod-sdk/FastTypes.sol";

mapping(address => Balance) public votingPower;
SharedCounter public weightedYesVotes;
SharedCounter public weightedNoVotes;

function vote(bool support, uint256 weight) public {
    requireTimeAfter(votingStart);
    requireTimeBefore(votingEnd);
    require(!hasVoted[msg.sender], "Already voted");
    require(votingPower[msg.sender].value() >= weight, "Insufficient voting power");

    hasVoted[msg.sender] = true;
    voters.add(msg.sender);

    if (support) {
        weightedYesVotes.incrementBy(weight);
    } else {
        weightedNoVotes.incrementBy(weight);
    }

    votingPower[msg.sender].spend(weight);

    emit VoteCast(msg.sender, support);
}
```

**Add multiple choice voting**:

```solidity
mapping(uint256 => SharedCounter) public choiceVotes;
uint256 public numChoices;

function vote(uint256 choice) public {
    require(choice < numChoices, "Invalid choice");
    requireTimeAfter(votingStart);
    requireTimeBefore(votingEnd);
    require(!hasVoted[msg.sender], "Already voted");

    hasVoted[msg.sender] = true;
    voters.add(msg.sender);
    choiceVotes[choice].increment();

    emit VoteCast(msg.sender, choice);
}
```

**Add quorum requirements**:

```solidity
uint256 public quorumPercentage = 50; // 50% participation required

function finalize() public onlyOwner returns (bool passed) {
    requireTimeAfter(votingEnd);

    uint256 yes = yesVotes.value();
    uint256 no = noVotes.value();
    uint256 total = voters.size();

    require(total >= (maxVoters * quorumPercentage) / 100, "Quorum not reached");

    passed = yes > no;
    emit VotingFinalized(passed, yes, no);
    return passed;
}
```

---

### 5. PodAuction.sol

**Purpose**: Simple auction system with time-based bidding

**What's included**:

- Balance FastType for bids
- Time utilities for auction periods
- Bid withdrawal logic
- Winner selection

**When to use**:

- NFT auctions
- Asset sales
- Competitive bidding systems
- Price discovery mechanisms

**Customization variables**:

```solidity
constructor(
    string memory _itemDescription,  // Item being auctioned
    uint256 _duration,                // Auction duration in seconds
    uint256 _reservePrice             // Minimum acceptable bid
)
```

**Common customizations**:

**Add automatic bid increments**:

```solidity
uint256 public minBidIncrement = 0.01 ether;

function bid() public payable {
    requireTimeAfter(auctionStart);
    requireTimeBefore(auctionEnd);
    require(!finalized, "Auction finalized");

    uint256 totalBid = bids[msg.sender].value() + msg.value;
    require(totalBid >= highestBid + minBidIncrement, "Bid too low");

    bids[msg.sender].credit(msg.value);

    if (totalBid > highestBid) {
        highestBid = totalBid;
        highestBidder = msg.sender;
        emit BidPlaced(msg.sender, totalBid);
    }
}
```

**Add automatic extension on late bids**:

```solidity
uint256 public extensionWindow = 5 minutes;
uint256 public extensionDuration = 5 minutes;

function bid() public payable {
    requireTimeAfter(auctionStart);
    requireTimeBefore(auctionEnd);
    require(!finalized, "Auction finalized");

    // Extend auction if bid is placed near end
    if (block.timestamp > auctionEnd - extensionWindow) {
        auctionEnd += extensionDuration;
    }

    // ... rest of bid logic
}
```

**Add buy-now price**:

```solidity
uint256 public buyNowPrice;

function buyNow() public payable {
    requireTimeAfter(auctionStart);
    requireTimeBefore(auctionEnd);
    require(!finalized, "Auction finalized");
    require(msg.value >= buyNowPrice, "Insufficient payment");

    finalized = true;
    winner = msg.sender;
    highestBid = buyNowPrice;
    highestBidder = msg.sender;

    emit AuctionFinalized(winner, buyNowPrice);
}
```

---

## General Customization Tips

### Combining FastTypes

Mix FastTypes for complex logic:

```solidity
contract GameLeaderboard {
    OwnedCounter public scores;          // Per-player scores
    AddressSet public activePlayers;     // Player tracking
    SharedCounter public totalGamesPlayed; // Global counter

    function recordGameResult(address winner, uint256 points) public {
        scores.incrementBy(winner, SCORE_KEY, points);
        activePlayers.add(winner);
        totalGamesPlayed.increment();
    }
}
```

### Adding Access Control

Extend beyond simple owner:

```solidity
mapping(address => bool) public admins;

modifier onlyAdmin() {
    require(admins[msg.sender] || msg.sender == owner, "Not admin");
    _;
}

function addAdmin(address admin) public onlyOwner {
    admins[admin] = true;
}
```

### Adding Pausable Functionality

```solidity
bool public paused;

modifier whenNotPaused() {
    require(!paused, "Contract paused");
    _;
}

function pause() public onlyOwner {
    paused = true;
}

function unpause() public onlyOwner {
    paused = false;
}
```

### Integrating Multiple Templates

Combine templates for complex applications:

```solidity
// NFT with voting rights
contract VotingNFT is PodNFT {
    mapping(uint256 => bool) public hasProposalVoted;

    function voteWithNFT(uint256 tokenId, bool support) public {
        require(owners[tokenId] == msg.sender, "Not token owner");
        require(!hasProposalVoted[tokenId], "NFT already voted");

        hasProposalVoted[tokenId] = true;
        // ... voting logic
    }
}
```

---

## Best Practices

1. **Always use FastTypes** for shared state that can be modified concurrently
2. **Test commutativity** - Ensure operations work in any order
3. **Use time utilities** - Always use `requireTimeAfter/Before` for time-based logic
4. **Emit events** - Track important state changes for indexing
5. **Add safety checks** - Validate inputs and state before operations
6. **Document custom logic** - Add comments explaining non-obvious code

---

## Testing Your Customized Contract

After customization, always test:

1. **Commutativity**: Run transactions in different orders
2. **Edge cases**: Zero values, max values, invalid inputs
3. **Time-based logic**: Test before/after time boundaries
4. **Access control**: Verify only authorized users can call restricted functions

See the pod network documentation for testing best practices and tools.

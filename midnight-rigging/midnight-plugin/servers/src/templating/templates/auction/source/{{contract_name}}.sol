// SPDX-License-Identifier: {{license}}
pragma solidity ^0.8.0;

import { Balance } from "pod-sdk/FastTypes.sol";
import { requireTimeAfter, requireTimeBefore } from "pod-sdk/Time.sol";

/**
 * @title {{contract_name}}
 * @dev Simple auction contract for pod network using FastTypes
 * @notice Uses Balance FastType and time utilities for order-independent bidding
 */
contract {{contract_name}} {
    // Auction details
    string public itemDescription;
    uint256 public auctionStart;
    uint256 public auctionEnd;
    uint256 public reservePrice;

    // Current highest bid
    address public highestBidder;
    uint256 public highestBid;

    // Bid tracking using Balance FastType
    mapping(address => Balance) public bids;

    // Auction state
    bool public finalized;
    address public winner;

    // Contract owner
    address public owner;

    // Events
    event BidPlaced(address indexed bidder, uint256 amount);
    event AuctionFinalized(address indexed winner, uint256 amount);
    event BidWithdrawn(address indexed bidder, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory _itemDescription,
        uint256 _duration,
        uint256 _reservePrice
    ) {
        itemDescription = _itemDescription;
        auctionStart = block.timestamp;
        auctionEnd = block.timestamp + _duration;
        reservePrice = _reservePrice;
        owner = msg.sender;
    }

    /**
     * @dev Place a bid
     */
    function bid() public payable {
        requireTimeAfter(auctionStart);
        requireTimeBefore(auctionEnd);
        require(!finalized, "Auction finalized");
        require(msg.value > 0, "Bid must be positive");

        // Credit the bid amount to sender's balance
        bids[msg.sender].credit(msg.value);

        uint256 totalBid = bids[msg.sender].value();

        // Update highest bid if this bid is higher
        if (totalBid > highestBid) {
            highestBid = totalBid;
            highestBidder = msg.sender;

            emit BidPlaced(msg.sender, totalBid);
        }
    }

    /**
     * @dev Finalize auction and determine winner
     */
    function finalize() public onlyOwner {
        requireTimeAfter(auctionEnd);
        require(!finalized, "Already finalized");

        finalized = true;

        if (highestBid >= reservePrice) {
            winner = highestBidder;
            emit AuctionFinalized(winner, highestBid);
        }
    }

    /**
     * @dev Withdraw bid (if not winner or auction cancelled)
     */
    function withdraw() public {
        require(finalized, "Auction not finalized");
        require(msg.sender != winner, "Winner cannot withdraw");

        uint256 amount = bids[msg.sender].value();
        require(amount > 0, "No bid to withdraw");

        // Spend (withdraw) the bid amount
        bids[msg.sender].spend(amount);

        // Transfer funds back
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit BidWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Owner claims winning bid
     * @custom:security Uses checks-effects-interactions pattern to prevent reentrancy
     * @custom:security Balance is cleared before external call
     */
    function claimWinningBid() public onlyOwner {
        require(finalized, "Auction not finalized");
        require(winner != address(0), "No winner");

        uint256 amount = bids[winner].value();
        require(amount > 0, "No winning bid");

        // Clear balance BEFORE transfer (checks-effects-interactions)
        bids[winner].spend(amount);

        // Transfer funds to owner
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Transfer failed");
    }

    /**
     * @dev Get bid amount for address
     * @param bidder Address to query
     * @return Bid amount
     */
    function getBid(address bidder) public view returns (uint256) {
        return bids[bidder].value();
    }

    /**
     * @dev Check if auction is active
     * @return active Whether auction is currently active
     */
    function isActive() public view returns (bool active) {
        return !finalized &&
               block.timestamp >= auctionStart &&
               block.timestamp < auctionEnd;
    }

    /**
     * @dev Get auction info
     * @return start Auction start time
     * @return end Auction end time
     * @return reserve Reserve price
     * @return current Current highest bid
     */
    function getAuctionInfo() public view returns (
        uint256 start,
        uint256 end,
        uint256 reserve,
        uint256 current
    ) {
        start = auctionStart;
        end = auctionEnd;
        reserve = reservePrice;
        current = highestBid;
    }
}

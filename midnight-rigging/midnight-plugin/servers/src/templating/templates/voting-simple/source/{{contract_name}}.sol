// SPDX-License-Identifier: {{license}}
pragma solidity ^0.8.0;

import { AddressSet } from "pod-sdk/FastTypes.sol";
import { SharedCounter } from "pod-sdk/FastTypes.sol";
import { requireTimeAfter, requireTimeBefore } from "pod-sdk/Time.sol";

/**
 * @title {{contract_name}}
 * @dev Simple voting contract for pod network using FastTypes
 * @notice Uses AddressSet for voters and SharedCounter for vote tallies
 */
contract {{contract_name}} {
    // Proposal details
    string public proposalDescription;
    uint256 public votingStart;
    uint256 public votingEnd;

    // Vote tracking
    AddressSet public voters;
    SharedCounter public yesVotes;
    SharedCounter public noVotes;

    // Prevent double voting (idempotent check)
    mapping(address => bool) public hasVoted;

    // Contract owner
    address public owner;

    // Events
    event VoteCast(address indexed voter, bool support);
    event ProposalCreated(string description, uint256 startTime, uint256 endTime);
    event VotingFinalized(bool passed, uint256 yesCount, uint256 noCount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory _proposalDescription,
        uint256 _votingDuration
    ) {
        proposalDescription = _proposalDescription;
        votingStart = block.timestamp;
        votingEnd = block.timestamp + _votingDuration;
        owner = msg.sender;

        voters = new AddressSet();
        yesVotes = new SharedCounter();
        noVotes = new SharedCounter();

        emit ProposalCreated(_proposalDescription, votingStart, votingEnd);
    }

    /**
     * @dev Cast a vote
     * @param support True for yes, false for no
     */
    function vote(bool support) public {
        requireTimeAfter(votingStart);
        requireTimeBefore(votingEnd);

        require(!hasVoted[msg.sender], "Already voted");

        // Prevent double voting
        hasVoted[msg.sender] = true;

        // Add to voter set
        voters.add(msg.sender);

        // Increment vote counter
        if (support) {
            yesVotes.increment();
        } else {
            noVotes.increment();
        }

        emit VoteCast(msg.sender, support);
    }

    /**
     * @dev Finalize voting and determine result
     * @return passed Whether the proposal passed
     */
    function finalize() public onlyOwner returns (bool passed) {
        requireTimeAfter(votingEnd);

        uint256 yes = yesVotes.value();
        uint256 no = noVotes.value();

        passed = yes > no;

        emit VotingFinalized(passed, yes, no);
        return passed;
    }

    /**
     * @dev Get total number of voters
     * @return Total voters
     */
    function totalVoters() public view returns (uint256) {
        return voters.size();
    }

    /**
     * @dev Get current vote counts
     * @return yes Yes votes
     * @return no No votes
     * @return total Total voters
     */
    function getVoteCounts() public view returns (uint256 yes, uint256 no, uint256 total) {
        yes = yesVotes.value();
        no = noVotes.value();
        total = voters.size();
    }

    /**
     * @dev Check if voting is active
     * @return active Whether voting is currently active
     */
    function isActive() public view returns (bool active) {
        return block.timestamp >= votingStart && block.timestamp < votingEnd;
    }

    /**
     * @dev Check if an address has voted
     * @param voter Address to check
     * @return voted Whether the address has voted
     */
    function hasAddressVoted(address voter) public view returns (bool voted) {
        return hasVoted[voter];
    }

    /**
     * @dev Get voting period info
     * @return start Voting start time
     * @return end Voting end time
     */
    function getVotingPeriod() public view returns (uint256 start, uint256 end) {
        start = votingStart;
        end = votingEnd;
    }
}

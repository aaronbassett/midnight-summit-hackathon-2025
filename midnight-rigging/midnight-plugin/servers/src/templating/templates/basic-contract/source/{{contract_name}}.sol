// SPDX-License-Identifier: {{license}}
pragma solidity ^0.8.0;

import { SharedCounter } from "pod-sdk/FastTypes.sol";

/**
 * @title {{contract_name}}
 * @dev Minimal starter template for pod network contracts
 * @notice This template demonstrates basic FastType usage and contract structure
 */
contract {{contract_name}} {
    // Example: Simple counter using SharedCounter FastType
    SharedCounter public counter;

    // Contract owner
    address public owner;

    // Events
    event CounterIncremented(uint256 newValue);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        // Initialize FastType - pod network pattern for SharedCounter
        counter = new SharedCounter();
    }

    /**
     * @dev Increment the counter
     * @notice Anyone can call this function
     */
    function increment() public {
        counter.increment();
        emit CounterIncremented(counter.value());
    }

    /**
     * @dev Get current counter value
     * @return Current counter value
     */
    function getCount() public view returns (uint256) {
        return counter.value();
    }

    /**
     * @dev Transfer ownership to new address
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // Add your custom contract logic below
    // Remember to use FastTypes for order-independent operations!
}

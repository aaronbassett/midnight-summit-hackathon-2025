// SPDX-License-Identifier: {{license}}
pragma solidity ^0.8.0;

import { Balance } from "pod-sdk/FastTypes.sol";

/**
 * @title {{contract_name}}
 * @dev ERC20-style token implementation for pod network using FastTypes
 * @notice This contract uses Balance FastType for order-independent transfers
 */
contract {{contract_name}} {
    // Token metadata
    string public name;
    string public symbol;
    uint8 public decimals;

    // Supply tracking
    Balance public totalSupply;
    uint256 public maxSupply;

    // Balances using Balance FastType
    mapping(address => Balance) public balances;

    // Allowances for approved spenders
    mapping(address => mapping(address => uint256)) public allowances;

    // Contract owner
    address public owner;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _maxSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        maxSupply = _maxSupply;
        owner = msg.sender;
        totalSupply = new Balance();
    }

    /**
     * @dev Transfer tokens to another address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to zero address");

        balances[msg.sender].spend(amount);
        balances[to].credit(amount);

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Transfer tokens from one address to another using allowance
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(allowances[from][msg.sender] >= amount, "Insufficient allowance");

        allowances[from][msg.sender] -= amount;

        balances[from].spend(amount);
        balances[to].credit(amount);

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @dev Approve spender to spend tokens on behalf of owner
     * @param spender Address authorized to spend
     * @param amount Amount approved
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev Mint new tokens (owner only)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(to != address(0), "Mint to zero address");

        if (maxSupply > 0) {
            require(totalSupply.value() + amount <= maxSupply, "Max supply exceeded");
        }

        totalSupply.credit(amount);
        balances[to].credit(amount);

        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public {
        balances[msg.sender].spend(amount);
        totalSupply.spend(amount);

        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    /**
     * @dev Get balance of an address
     * @param account Address to query
     * @return Balance amount
     */
    function balanceOf(address account) public view returns (uint256) {
        return balances[account].value();
    }

    /**
     * @dev Get allowance for spender
     * @param tokenOwner Owner of tokens
     * @param spender Authorized spender
     * @return Allowance amount
     */
    function allowance(address tokenOwner, address spender) public view returns (uint256) {
        return allowances[tokenOwner][spender];
    }
}

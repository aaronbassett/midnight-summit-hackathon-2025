// SPDX-License-Identifier: {{license}}
pragma solidity ^0.8.0;

import { SharedCounter, Balance } from "pod-sdk/FastTypes.sol";

/**
 * @title {{contract_name}}
 * @dev ERC721-style NFT implementation for pod network using FastTypes
 * @notice Uses SharedCounter for token ID generation and Balance for supply tracking
 */
contract {{contract_name}} {
    // Token metadata
    string public name;
    string public symbol;

    // Token ID tracking
    SharedCounter public nextTokenId;
    Balance public totalSupply;
    uint256 public maxSupply;

    // NFT ownership
    mapping(uint256 => address) public owners;
    mapping(address => uint256) public balances;

    // Approvals
    mapping(uint256 => address) public tokenApprovals;
    mapping(address => mapping(address => bool)) public operatorApprovals;

    // Contract owner
    address public owner;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Mint(address indexed to, uint256 indexed tokenId);
    event Burn(uint256 indexed tokenId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply
    ) {
        name = _name;
        symbol = _symbol;
        maxSupply = _maxSupply;
        owner = msg.sender;
        nextTokenId = new SharedCounter();
        totalSupply = new Balance();
    }

    /**
     * @dev Mint a new NFT
     * @param to Recipient address
     */
    function mint(address to) public onlyOwner returns (uint256) {
        require(to != address(0), "Mint to zero address");

        if (maxSupply > 0) {
            require(totalSupply.value() < maxSupply, "Max supply reached");
        }

        uint256 tokenId = nextTokenId.value();
        nextTokenId.increment();
        totalSupply.credit(1);

        _mint(to, tokenId);

        return tokenId;
    }

    /**
     * @dev Internal mint function
     */
    function _mint(address to, uint256 tokenId) internal {
        require(owners[tokenId] == address(0), "Token already minted");

        owners[tokenId] = to;
        balances[to]++;

        emit Mint(to, tokenId);
        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Transfer NFT to another address
     * @param to Recipient address
     * @param tokenId Token ID to transfer
     */
    function transfer(address to, uint256 tokenId) public {
        require(to != address(0), "Transfer to zero address");
        require(owners[tokenId] == msg.sender, "Not token owner");

        _transfer(msg.sender, to, tokenId);
    }

    /**
     * @dev Transfer NFT from one address to another
     * @param from Sender address
     * @param to Recipient address
     * @param tokenId Token ID to transfer
     */
    function transferFrom(address from, address to, uint256 tokenId) public {
        require(to != address(0), "Transfer to zero address");
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not approved");

        _transfer(from, to, tokenId);
    }

    /**
     * @dev Internal transfer function
     */
    function _transfer(address from, address to, uint256 tokenId) internal {
        require(owners[tokenId] == from, "From address not owner");

        // Clear approvals
        if (tokenApprovals[tokenId] != address(0)) {
            delete tokenApprovals[tokenId];
        }

        balances[from]--;
        balances[to]++;
        owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Approve address to transfer token
     * @param approved Address to approve
     * @param tokenId Token ID
     */
    function approve(address approved, uint256 tokenId) public {
        address tokenOwner = owners[tokenId];
        require(msg.sender == tokenOwner || operatorApprovals[tokenOwner][msg.sender], "Not authorized");

        tokenApprovals[tokenId] = approved;
        emit Approval(tokenOwner, approved, tokenId);
    }

    /**
     * @dev Set approval for all tokens
     * @param operator Operator address
     * @param approved Approval status
     */
    function setApprovalForAll(address operator, bool approved) public {
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @dev Burn an NFT
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) public {
        require(owners[tokenId] == msg.sender, "Not token owner");

        balances[msg.sender]--;
        totalSupply.spend(1);
        delete owners[tokenId];
        delete tokenApprovals[tokenId];

        emit Burn(tokenId);
        emit Transfer(msg.sender, address(0), tokenId);
    }

    /**
     * @dev Get owner of token
     * @param tokenId Token ID
     * @return Owner address
     */
    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }

    /**
     * @dev Get balance of address
     * @param account Address to query
     * @return Token count
     */
    function balanceOf(address account) public view returns (uint256) {
        require(account != address(0), "Zero address query");
        return balances[account];
    }

    /**
     * @dev Get approved address for token
     * @param tokenId Token ID
     * @return Approved address
     */
    function getApproved(uint256 tokenId) public view returns (address) {
        require(owners[tokenId] != address(0), "Token does not exist");
        return tokenApprovals[tokenId];
    }

    /**
     * @dev Check if operator is approved for all
     * @param tokenOwner Owner address
     * @param operator Operator address
     * @return Approval status
     */
    function isApprovedForAll(address tokenOwner, address operator) public view returns (bool) {
        return operatorApprovals[tokenOwner][operator];
    }

    /**
     * @dev Internal function to check approval
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address tokenOwner = owners[tokenId];
        return (spender == tokenOwner ||
                tokenApprovals[tokenId] == spender ||
                operatorApprovals[tokenOwner][spender]);
    }
}

# {{contract_name}}

**Project**: {{project_name}}
**Author**: {{author}}
**Created**: {{CURRENT_DATE}}
**Template**: [{{TEMPLATE_NAME}}]({{homepage}}) v{{TEMPLATE_VERSION}}

A simple NFT smart contract implementation for Pod Network with a Rust CLI for contract interaction.

## Installation Path

`{{TARGET_DIR}}`

## Platform

- **OS**: {{OS_TYPE}} ({{OS_ARCH}})
- **Platform**: {{OS_PLATFORM}}

## Features

- ✅ Basic NFT minting with metadata URIs
- ✅ Token transfers between addresses
- ✅ Ownership verification using Pod's `requireQuorum`
- ✅ Event emission for Minted and Transferred events
- ✅ Rust CLI with multiple subcommands
- ✅ Verified event streaming with cryptographic verification

## Prerequisites

- Rust (2021 edition or later)
- Access to a Pod Network node (local or remote)
- Cargo package manager

## Getting Started

### 1. Build the Project

{{#if (eq OS_PLATFORM "win32")}}

```cmd
cargo build --release
```

{{else}}

```bash
cargo build --release
```

{{/if}}

### 2. Deploy the Contract

First, deploy the `{{contract_name}}.sol` contract to Pod Network. You can use your preferred deployment method (Foundry, Hardhat, etc.).

Once deployed, note the contract address.

### 3. Update Configuration

The CLI defaults to:

- **Contract Address**: `{{default_contract_address}}`
- **RPC URL**: `{{default_rpc_url}}`

You can override these with command-line flags:

```bash
cargo run -- --contract-address 0xYourContractAddress --rpc-url ws://your-rpc-url:8545 <command>
```

## Usage

### Mint an NFT

Mint a new NFT with a token ID and metadata URI:

```bash
cargo run -- mint <token_id> <uri>
```

Example:

```bash
cargo run -- mint 1 "ipfs://QmExample123"
```

### Query Token URI

Get the metadata URI for a specific token:

```bash
cargo run -- get-token-uri <token_id>
```

Example:

```bash
cargo run -- get-token-uri 1
```

### Transfer an NFT

Transfer an NFT to another address:

```bash
cargo run -- transfer-token <token_id> <recipient_address>
```

Example:

```bash
cargo run -- transfer-token 1 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### Watch Minted Events

Stream all Minted events from the contract with cryptographic verification:

```bash
cargo run -- watch
```

Filter events by owner:

```bash
cargo run -- watch --from 0xOwnerAddress
```

## Contract Details

- **Name**: {{contract_name}}
- **Solidity Version**: ^0.8.26
- **Features**:
  - Minting restricted to contract deployer
  - Transfer function with ownership verification via `requireQuorum`
  - Token URI storage and retrieval

## Project Structure

```
{{TARGET_NAME}}/
├── Cargo.toml              # Rust project manifest
├── {{contract_name}}.sol   # Solidity NFT contract
├── src/
│   └── main.rs            # Rust CLI application
└── README.md              # This file
```

## Customization Ideas

- Add a `burn()` function to destroy NFTs
- Implement max supply limits
- Add access control for minting (whitelist, roles)
- Extend CLI with batch minting
- Add transfer approval mechanisms
- Implement token enumeration

## Dependencies

- **pod-sdk** (0.5.0): Pod Network SDK for Rust
- **pod-types** (0.3.0): Pod Network type definitions
- **alloy** (1.0.36): Ethereum types and contract bindings
- **tokio** (1.47.1): Async runtime
- **clap** (4.5.48): CLI argument parsing

## Resources

- [Pod Network Documentation]({{documentation}})
- [Pod Network Homepage]({{homepage}})
- [Repository]({{repository}})

## License

This project was scaffolded with {{TEMPLATE_NAME}}. For more information, see the [documentation]({{documentation}}).

---

Generated on {{CURRENT_TIMESTAMP}}

# {{contract_name}}

**Project**: {{project_name}}
**Token**: {{token_name}} ({{token_symbol}})
**Initial Supply**: {{initial_supply}}
**Author**: {{author}}
**Created**: {{CURRENT_DATE}}
**Template**: [{{TEMPLATE_NAME}}]({{homepage}}) v{{TEMPLATE_VERSION}}

A fungible token smart contract implementation for Pod Network with a Rust CLI for contract interaction.

## Installation Path

`{{TARGET_DIR}}`

## Platform

- **OS**: {{OS_TYPE}} ({{OS_ARCH}})
- **Platform**: {{OS_PLATFORM}}

## Features

- ✅ Fungible token with standard ERC-20-like interface
- ✅ Token transfers between addresses
- ✅ Balance queries for any address
- ✅ Transfer verification using Pod's `requireQuorum`
- ✅ Transfer event emission
- ✅ Rust CLI with multiple subcommands
- ✅ Verified event streaming with cryptographic verification
- ✅ Foundry tooling for compilation and testing

## Prerequisites

- **Foundry**: Required for Solidity contract compilation ([Install Foundry](https://book.getfoundry.sh/getting-started/installation))
- **Rust**: 2021 edition or later ([Install Rust](https://www.rust-lang.org/tools/install))
- **Pod Network Node**: Access to a local or remote Pod Network node
- **Cargo**: Package manager (comes with Rust)

## Getting Started

### 1. Install Solidity Dependencies

Install the Pod SDK for Solidity using Foundry:

{{#if (eq OS_PLATFORM "win32")}}

```cmd
forge install podnetwork/pod-sdk
```

{{else}}

```bash
forge install podnetwork/pod-sdk
```

{{/if}}

This will install the Pod SDK into the `lib/` directory and create the necessary remappings.

### 2. Build the Solidity Contract

Compile the contract using Foundry:

{{#if (eq OS_PLATFORM "win32")}}

```cmd
forge build
```

{{else}}

```bash
forge build
```

{{/if}}

The compiled artifacts will be in the `out/` directory.

### 3. Deploy the Contract

Deploy the `{{contract_name}}.sol` contract to Pod Network with the following constructor parameters:

- **tokenName**: `"{{token_name}}"`
- **tokenSymbol**: `"{{token_symbol}}"`
- **initialSupply**: `{{initial_supply}}`

You can use Foundry's deployment tools:

{{#if (eq OS_PLATFORM "win32")}}

```cmd
forge create contracts/{{contract_name}}.sol:{{contract_name}} ^
  --constructor-args "{{token_name}}" "{{token_symbol}}" {{initial_supply}} ^
  --rpc-url <your-rpc-url> ^
  --private-key <your-private-key>
```

{{else}}

```bash
forge create contracts/{{contract_name}}.sol:{{contract_name}} \
  --constructor-args "{{token_name}}" "{{token_symbol}}" {{initial_supply}} \
  --rpc-url <your-rpc-url> \
  --private-key <your-private-key>
```

{{/if}}

Once deployed, note the contract address for CLI usage.

### 4. Build the Rust CLI

Compile the Rust CLI application:

{{#if (eq OS_PLATFORM "win32")}}

```cmd
cargo build --release
```

{{else}}

```bash
cargo build --release
```

{{/if}}

### 5. Update Configuration

The CLI defaults to:

- **Contract Address**: `{{default_contract_address}}`
- **RPC URL**: `{{default_rpc_url}}`

You can override these with command-line flags:

```bash
cargo run -- --contract-address 0xYourContractAddress --rpc-url ws://your-rpc-url:8545 <command>
```

## CLI Usage

### Query Token Balance

Get the token balance for a specific address:

```bash
cargo run -- get-balance <address>
```

Example:

```bash
cargo run -- get-balance 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### Transfer Tokens

Transfer tokens to another address:

```bash
cargo run -- transfer-token <amount> <recipient_address>
```

Example:

```bash
cargo run -- transfer-token 100 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### Watch Transfer Events

Stream all Transfer events from the contract with cryptographic verification:

```bash
cargo run -- watch
```

Filter events by sender:

```bash
cargo run -- watch --from 0xSenderAddress
```

## Contract Details

- **Contract Name**: {{contract_name}}
- **Token Name**: {{token_name}}
- **Token Symbol**: {{token_symbol}}
- **Initial Supply**: {{initial_supply}}
- **Solidity Version**: ^0.8.26
- **Features**:
  - Standard balanceOf and transfer functions
  - Transfer verification via `requireQuorum`
  - Transfer event emission
  - Initial supply allocated to deployer

## Project Structure

```
{{TARGET_NAME}}/
├── Cargo.toml              # Rust project manifest
├── foundry.toml            # Foundry configuration
├── contracts/
│   └── {{contract_name}}.sol   # Solidity token contract
├── src/
│   └── main.rs            # Rust CLI application
├── lib/                   # Foundry dependencies (after forge install)
├── out/                   # Compiled contracts (after forge build)
└── README.md              # This file
```

## Customization Ideas

- Add `approve()` and `transferFrom()` for ERC-20 compatibility
- Implement `mint()` and `burn()` functions for supply management
- Add access control for privileged operations (owner, minter roles)
- Extend CLI with approval and allowance commands
- Add token metadata functions (`decimals()`, view-only `totalSupply()`)
- Implement Foundry tests in `test/` directory
- Add events for minting and burning

## Testing with Foundry

Create tests in a `test/` directory:

{{#if (eq OS_PLATFORM "win32")}}

```cmd
mkdir test
```

{{else}}

```bash
mkdir test
```

{{/if}}

Run tests with:

```bash
forge test
```

## Dependencies

### Rust Dependencies

- **pod-sdk** (0.5.0): Pod Network SDK for Rust
- **pod-types** (0.3.0): Pod Network type definitions
- **alloy** (1.0.36): Ethereum types and contract bindings
- **tokio** (1.47.1): Async runtime
- **clap** (4.5.48): CLI argument parsing

### Solidity Dependencies

- **pod-sdk** (Foundry): Pod Network Solidity SDK

## Resources

- [Pod Network Documentation]({{documentation}})
- [Pod Network Homepage]({{homepage}})
- [Repository]({{repository}})
- [Foundry Book](https://book.getfoundry.sh/)

## License

This project was scaffolded with {{TEMPLATE_NAME}}. For more information, see the [documentation]({{documentation}}).

---

Generated on {{CURRENT_TIMESTAMP}}

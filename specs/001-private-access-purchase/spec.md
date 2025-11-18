# Feature Specification: Private Access Purchase System

**Feature Branch**: `001-private-access-purchase`
**Created**: 2025-11-18
**Status**: Draft
**Input**: User description: "I want to create an app for purchasing access to a service either via a one-time purchase or via a subscription. We will need a token contract which is what we'll use to make the purchases. The actual purchase flow will be something like: vendor supplies price for 1 time access and price for a 30 day subscription. User decides which to purchase and transfers the corresponding amount of token. User provides the vendor with a proof of access. Vendor can use the proof of access to verify that the user should be given access. This is the key part. The proof of access must not disclose any information about the buyer. No wallet addresses. How much they paid. If it is a subscription or one time access. Nothing. Just a simple yes they should be granted access, or no they should not. Create a CLI tool for making the purchases and for verifying them."

## Clarifications

### Session 2025-11-18

- Q: When a user transfers an incorrect token amount (e.g., 150 tokens for a 100-token one-time purchase), what should happen? → A: Reject the transaction entirely and require exact amount
- Q: How should the system handle subscription renewal at the 30-day boundary? → A: No automatic renewal; user must make new purchase
- Q: What should happen if a vendor attempts to verify a proof from a different vendor's service? → A: Verification fails with "access denied" (no indication of wrong vendor)
- Q: What should happen if the token contract becomes unavailable during purchase or verification? → A: Operation fails with clear error message; user can retry later
- Q: How should proof storage work for users who need to present proofs for verification? → A: Proofs stored on-chain; user provides proof ID to vendor

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Purchase One-Time Access (Priority: P1)

A user wants to purchase one-time access to a service from a vendor without revealing their identity or purchase details.

**Why this priority**: This is the core MVP - a single purchase flow that demonstrates the privacy-preserving proof system. If this works, the product has value.

**Independent Test**: Can be fully tested by a user purchasing one-time access via CLI, generating a proof, and a vendor verifying that proof grants access - all without any identifying information being revealed.

**Acceptance Scenarios**:

1. **Given** vendor has configured one-time access price of 100 tokens, **When** user purchases one-time access and transfers 100 tokens, **Then** user receives a proof ID for the on-chain stored proof
2. **Given** user has a valid proof ID, **When** vendor verifies the proof ID via CLI, **Then** vendor receives confirmation "access granted" with no additional user information
3. **Given** user has used their one-time access proof, **When** user attempts to reuse the same proof, **Then** verification fails with "access denied"
4. **Given** user has not made a purchase, **When** user attempts to generate a proof, **Then** system rejects the request

---

### User Story 2 - Purchase Subscription Access (Priority: P2)

A user wants to purchase a 30-day subscription to a service, with the ability to verify access multiple times during the subscription period without revealing identity.

**Why this priority**: Subscription model extends the core functionality and demonstrates time-based access control while maintaining privacy. Essential for recurring revenue but builds on P1 foundation.

**Independent Test**: Can be tested independently by purchasing a subscription, verifying access multiple times within 30 days, and confirming that verification fails after the subscription expires.

**Acceptance Scenarios**:

1. **Given** vendor has configured 30-day subscription price of 500 tokens, **When** user purchases subscription and transfers 500 tokens, **Then** user receives a proof ID for the on-chain stored subscription proof
2. **Given** user has an active subscription proof ID, **When** vendor verifies the proof ID multiple times within 30 days, **Then** each verification returns "access granted"
3. **Given** user's subscription has expired (>30 days), **When** vendor attempts to verify the proof ID, **Then** verification returns "access denied"
4. **Given** user has an active subscription proof ID, **When** user checks their access status via CLI, **Then** system shows remaining subscription time without revealing identity

---

### User Story 3 - Vendor Price Management (Priority: P3)

A vendor wants to configure and update pricing for both one-time access and subscription access.

**Why this priority**: Price management is necessary for vendor control but the system can function with hardcoded prices initially. Lower priority since it's administrative functionality.

**Independent Test**: Can be tested by vendor setting prices via CLI, then users purchasing at those prices, and vendor updating prices for future purchases without affecting existing proofs.

**Acceptance Scenarios**:

1. **Given** vendor is setting up their service, **When** vendor configures one-time price of 100 tokens and subscription price of 500 tokens via CLI, **Then** prices are stored and applied to future purchases
2. **Given** vendor wants to run a promotion, **When** vendor updates prices to new values, **Then** new purchases use updated prices while existing access proofs remain valid
3. **Given** vendor queries current pricing, **When** vendor runs CLI price check command, **Then** system displays current one-time and subscription prices

---

### Edge Cases

- **Incorrect token amount**: System rejects transactions that don't match exact purchase price (no overpayment or underpayment accepted)
- **Subscription renewal**: No automatic renewal at 30-day boundary; user must manually purchase a new subscription
- **Cross-vendor proof verification**: Verification fails with "access denied" without revealing that proof was issued for different vendor (maintains zero-knowledge property)
- **Proof replay attacks**: Prevented by vendor-specific proof scoping (FR-011); cross-vendor attempts result in silent "access denied"
- **Token contract unavailability**: Operations fail with clear error message instructing user to retry later (no queuing or offline mode)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support two purchase types: one-time access and 30-day subscription
- **FR-002**: System MUST accept token transfers as payment for access purchases
- **FR-003**: System MUST generate zero-knowledge proofs of access that reveal no buyer information (no wallet address, amount paid, or purchase type)
- **FR-004**: Vendors MUST be able to verify proofs and receive only binary access decision (granted/denied)
- **FR-005**: System MUST prevent one-time access proofs from being reused after initial verification
- **FR-006**: System MUST enforce 30-day expiration on subscription access proofs with no automatic renewal
- **FR-007**: CLI tool MUST provide commands for: purchasing access (returns proof ID), verifying proof IDs, and checking proof status
- **FR-008**: Vendors MUST be able to configure pricing for one-time and subscription access
- **FR-009**: System MUST validate that token transfer amount exactly matches the purchase type price and reject incorrect amounts
- **FR-010**: System MUST maintain purchase records privately (not visible to vendors during verification)
- **FR-011**: Proofs MUST be vendor-specific to prevent cross-vendor replay attacks; invalid vendor verification returns "access denied" without revealing reason
- **FR-012**: System MUST handle subscription expiration automatically based on purchase timestamp

### Key Entities

- **Access Purchase**: Represents a user's purchase transaction, containing purchase type (one-time or subscription), token amount, timestamp, and proof generation capability. Not exposed to vendors.
- **Access Proof**: Zero-knowledge proof stored on-chain that demonstrates valid access rights without revealing purchase details, buyer identity, or amount paid. Referenced by unique proof ID. Contains verification data and expiration information for subscriptions.
- **Vendor Configuration**: Stores vendor-specific settings including one-time access price, subscription price, and vendor identifier for proof scoping.
- **Token Transfer**: Records token payment from user to vendor, linked privately to access purchase for validation.

### Assumptions

- Using Midnight blockchain zero-knowledge proof capabilities for privacy-preserving verification
- Token contract follows standard ERC-20-like interface for transfers
- Subscription period is fixed at 30 days (not configurable per-subscription in MVP)
- One vendor per service instance in MVP (multi-vendor support is future enhancement)
- Proofs are generated and stored on-chain during purchase; verification happens on-chain via smart contract
- System clock synchronization is reliable for subscription expiration checks
- Users receive and share proof IDs (not the full proof data); on-chain storage enables verification without user-managed proof files

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a purchase and generate a valid access proof in under 2 minutes
- **SC-002**: Vendor verification of access proofs completes in under 5 seconds
- **SC-003**: Zero information leakage: security audit confirms no buyer data revealed during proof verification
- **SC-004**: System handles 100 concurrent purchase transactions without degradation
- **SC-005**: 100% of valid one-time proofs are rejected on second use attempt
- **SC-006**: Subscription access proofs correctly expire within 1 minute of 30-day boundary
- **SC-007**: CLI tool successfully executes purchase and verification flows on first attempt for 90% of users
- **SC-008**: System prevents 100% of cross-vendor proof replay attempts

### Quality Goals

- **QG-001**: CLI provides clear error messages for invalid token amounts, expired proofs, and verification failures
- **QG-002**: All purchase and verification operations are logged for vendor analytics (while maintaining buyer privacy)
- **QG-003**: System handles token contract unavailability by failing operations with clear error message and retry instructions

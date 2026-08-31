# Architecture Notes

## Core design goal

ArcRelief demonstrates a transparent USDC treasury workflow on Arc Testnet rather than attempting to model a full humanitarian-aid organization.

## Flow

1. Organizer creates a campaign.
2. One or more contributors fund it through Arc native USDC's ERC-20 interface.
3. Organizer records recipient allocations.
4. Organizer executes payouts individually or as a batch.
5. Contract events and public state expose the disbursement trail.
6. Arcscan provides independent transaction-level verification.

## Accounting invariants

For each campaign:

- `distributedAmount <= fundedAmount`
- A recipient can never receive more than its allocation.
- A closed campaign must have no undistributed accounting balance (`fundedAmount == distributedAmount`).
- `targetAmount` is an informational goal, not a hard funding cap or settlement condition.
- Cancellation is only available before the first payout.
- On organizer-triggered pre-payout cancellation, contributors claim their own deposits rather than allowing the organizer to receive third-party deposits.
- Contributors do not have a unilateral withdrawal path while a campaign remains Active.

These constraints are intentional safeguards for the prototype.

## Why the USDC ERC-20 interface?

Arc's native gas asset is USDC. Arc also exposes the same underlying USDC balance through an ERC-20 interface, enabling `approve`, `transferFrom`, and allowance-based contract flows without a wrapped token.

ArcRelief therefore uses the ERC-20 interface for all application accounting and transfers.

## Future Arc-native extensions

- CCTP funding from another chain
- Gateway-backed chain-abstracted funding
- Arc Memo extension for payout metadata
- Multicall3From for richer batch workflows

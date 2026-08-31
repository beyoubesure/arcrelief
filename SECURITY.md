# Security

ArcRelief is an experimental Arc Testnet project and has **not** been professionally audited.

Do not deploy this repository with production funds.

## Known scope limitations

- The organizer is trusted to choose recipients and initiate payouts.
- Contributors cannot unilaterally withdraw from an active campaign. Refunds are available only after the organizer cancels a campaign before any payout.
- `targetAmount` is informational: it is not a funding cap and is not required to be reached before closure.
- Campaign funds are pooled in one contract token balance and separated by internal accounting rather than per-campaign vaults.
- Direct unsolicited USDC transfers to the contract are not assigned to a campaign and may become stranded.
- A cancelled campaign's `fundedAmount` decreases as contributors claim refunds; it therefore becomes an outstanding-refundable balance rather than immutable historical gross funding.
- No duplicate-recipient protection.
- No production-grade governance or multisig policy.
- No KYC/eligibility system.
- No privacy layer for recipient metadata.
- No formal verification.
- No production indexer.
- No emergency pause.
- No professional smart-contract audit.

## Data policy

Never place patient information, medical records, government IDs, phone numbers, home addresses, or other sensitive personal data directly onchain.

Recipient labels in the demo should be generic test labels only.

## Reporting

For a public repository, use GitHub Issues for non-sensitive bugs. Do not publish live secrets, private keys, seed phrases, or exploitable production information.

# Pre-Deployment Audit Record

Status: **PASS WITH EXTERNAL EXECUTION PENDING**

This record covers all checks that can be performed without the owner's wallet signature or an actual Arc Testnet deployment.

## A. Arc configuration

Verified against current Arc documentation at preparation time:

- Chain ID: `5042002`
- Chain ID hex: `0x4cef52`
- RPC: `https://rpc.testnet.arc.io`
- Explorer: `https://testnet.arcscan.app`
- Native gas asset: USDC, 18-decimal native precision
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000`
- USDC ERC-20 interface precision: 6 decimals

The app intentionally uses the ERC-20 interface for balances and transfer accounting.

## B. Contract accounting/security review

Checked:

- campaign existence guard
- organizer authorization
- nonzero title/target/allocation/address checks
- active-state checks
- checks-effects-interactions ordering on payout/refund
- nonReentrant protection on token-moving entry points
- recipient double-payout prevention
- underfunded payout prevention
- batch size limits
- atomic batch behavior
- contributor-level funding accounting
- cancellation prohibited after payout starts
- contributor-owned cancellation refunds
- double-refund prevention
- campaign close prohibited with undistributed balance

### Accepted prototype limitations

- Funds are pooled in one contract address while accounting is segregated by campaign.
- Direct unsolicited USDC transfers to the contract are not credited to a campaign and may be stranded.
- Recipient labels are public and must never contain sensitive personal/medical data.
- No production pause, multisig governance, KYC, privacy layer, formal verification, or professional audit.
- Organizer remains trusted to define eligible recipients and trigger payouts.

These limitations are documented and acceptable for a testnet Builder prototype, not for production.

## C. Frontend review

Checked:

- Arc network switching/addition
- correct native-currency precision declaration (18)
- ERC-20 amounts encoded/decoded with 6 decimals
- address validation
- approve -> fund workflow
- recipient add workflow
- individual payout workflow
- batch payout workflow
- duplicate batch index guard in UI
- campaign close/cancel workflow
- contributor refund workflow
- contract read-only mode before wallet connection
- HTML escaping for user-controlled campaign titles and labels
- Arcscan transaction links
- configured-address warning

## D. Repository hygiene

Checked:

- `.env` ignored
- `.env.example` contains placeholders only
- no embedded private key or seed phrase
- deployment and smoke scripts included
- GitHub Actions CI included
- security, architecture, deployment, changelog, and Builder-application documentation included

## E. Automated checks prepared

- Hardhat compile
- Hardhat contract tests
- JavaScript syntax checks
- post-deployment smoke script

JavaScript syntax checks pass locally.

Dependency installation / Solidity compilation could not be completed in the preparation environment because the package installation attempt timed out. These checks must therefore run in the owner's local environment or GitHub Actions before deployment.

## F. Hard stop before Builder submission

Do **not** submit the Builder application until all of these are verified against the real public deployment:

- dependency installation succeeds
- `npm run check` passes
- actual Arc Testnet deployment succeeds
- deployed bytecode/address is visible on Arcscan
- smoke check succeeds
- live frontend points to the real contract
- test campaign is created
- at least two recipients are added
- real testnet funding succeeds
- individual or batch payout succeeds
- recipient balances/state update correctly
- GitHub repository is public
- live demo works in a fresh browser session
- repository contains no secrets
- application claims exactly match the deployed implementation

At that point perform a final regression audit before submission.

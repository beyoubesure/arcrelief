# ArcRelief

**Transparent USDC emergency-disbursement infrastructure built on Arc Testnet.**

ArcRelief is an experimental dApp that explores how Arc's stablecoin-native architecture can support transparent, multi-recipient treasury workflows. An organizer creates a campaign, registers recipient allocations, funds the treasury in USDC, and disburses payments onchain.

> Testnet prototype only. The contract has not been audited and must not be used with real funds.

## Why Arc?

Arc is designed around stablecoin-native financial applications. On Arc Testnet:

- USDC is the native gas asset.
- Native USDC also exposes a standard ERC-20 interface for `approve`, `transferFrom`, allowances, and transfers.
- Applications can therefore denominate both the transferred value and transaction costs in dollars.
- Arc is EVM-compatible, which keeps the development workflow familiar.

ArcRelief uses the native USDC ERC-20 interface at:

```text
0x3600000000000000000000000000000000000000
```

The ERC-20 interface uses **6 decimals**.

## Motivation

Circle and the broader stablecoin ecosystem have demonstrated real-world use cases around humanitarian aid, financial inclusion, and rapid cross-border disbursement. ArcRelief is a technical experiment inspired by that design space: what would a transparent emergency-disbursement workflow look like if it were built natively on Arc?

The project is not affiliated with Circle and is not a production aid platform.

## Features

### Smart contract
- Create independent relief campaigns
- Set a USDC funding target
- Register recipient allocations
- Batch-add up to 50 recipients
- Fund campaigns through USDC `approve` + `transferFrom`
- Pay individual recipients
- Batch payout support (contract + frontend)
- Campaign-level accounting
- Close a completed campaign
- Pre-payout campaign cancellation with contributor-owned refunds
- Contributor refund claims after pre-payout cancellation
- Onchain events for campaigns, funding, allocation, and payout

### Frontend
- MetaMask / EVM wallet connection
- Automatic Arc Testnet network setup
- Live native-USDC balance
- Campaign creation
- USDC approval and campaign funding
- Recipient registration
- Recipient payout
- Live onchain campaign explorer
- Recipient payout status
- Arcscan transaction links
- Responsive interface
- GitHub Actions compile/syntax CI

## Architecture

```text
                        Arc Testnet
                            │
                    Native USDC / gas
                            │
             ┌──────────────┴──────────────┐
             │                             │
         Funder wallet                Organizer wallet
             │                             │
             │ approve + fund              │ manages campaign
             ▼                             ▼
                    ┌─────────────────┐
                    │    ArcRelief    │
                    │ smart contract  │
                    └────────┬────────┘
                             │
                     payout / batch payout
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
       Recipient A      Recipient B      Recipient C
            │                │                │
            └────────────────┼────────────────┘
                             ▼
                    Onchain transparency
                    + Arcscan history
```

## Repository structure

```text
arcrelief/
├── contracts/
│   └── ArcRelief.sol
├── scripts/
│   └── deploy.js
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── abi.js
│   └── config.js
├── .env.example
├── .gitignore
├── hardhat.config.js
├── package.json
└── README.md
```

## Arc Testnet

| Parameter | Value |
|---|---|
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |
| Gas asset | USDC |
| USDC ERC-20 interface | `0x3600000000000000000000000000000000000000` |

Test USDC is available from Circle Faucet.


## Live Arc Testnet deployment

- **Contract:** `0xc22A601f248c21fEAB92B9654c37bD484D2c92b9`
- **Arcscan:** https://testnet.arcscan.app/address/0xc22A601f248c21fEAB92B9654c37bD484D2c92b9
- **Network:** Arc Testnet (`5042002`)

The live demo is deployed separately through GitHub Pages from the `frontend/` directory.


## Quick start

### 1. Install Node.js

Install a current Node.js LTS release.

### 2. Install dependencies

From the repository folder:

```bash
npm install
```

### 3. Compile

```bash
npm run compile
```

### 4. Create a testnet development wallet

Use a dedicated test wallet. Do **not** use a wallet holding real assets.

Copy:

```text
.env.example
```

to:

```text
.env
```

and add the development wallet's private key.

`.env` is ignored by Git.

### 5. Get Arc Testnet USDC

Use Circle Faucet and request test USDC on Arc Testnet.

USDC is also the gas asset, so the deployment wallet needs a small test balance.

### 6. Deploy ArcRelief

```bash
npm run deploy:testnet
```

The terminal will print:

```text
ArcRelief deployed to:
0x...

Arcscan:
https://testnet.arcscan.app/address/0x...
```

### 7. Configure the frontend

Open:

```text
frontend/config.js
```

and replace:

```javascript
window.ARCRELIEF_ADDRESS = "";
```

with:

```javascript
window.ARCRELIEF_ADDRESS = "0xc22A601f248c21fEAB92B9654c37bD484D2c92b9";
```

### 8. Run the frontend

```bash
npm run serve
```

Open:

```text
http://localhost:8080
```


## Automated tests

The repository includes a Hardhat test suite covering the main treasury invariants and failure paths:

```bash
npm test
```

The tests cover:

- campaign creation validation
- organizer-only permissions
- independent third-party contribution accounting
- successful and underfunded payouts
- double-payout prevention
- atomic batch payouts
- pre-payout cancellation rules
- contributor-owned refunds
- double-refund prevention
- close-with-undistributed-funds prevention
- fully settled campaign closure
- batch-size limits

For a full local preflight:

```bash
npm run check
```

## Suggested demo flow

Use two or more Arc Testnet wallets.

1. Connect the organizer wallet.
2. Create a campaign with a target of `10 USDC`.
3. Add two recipient wallets with allocations of `1 USDC` each.
4. Fund the campaign with `2 USDC`.
5. Trigger each payout.
6. Confirm the recipient status changes from `Pending` to `Paid`.
7. Open the generated Arcscan transaction links.
8. Show that the campaign's `distributedAmount` increased onchain.

## Security notes

This repository is intentionally scoped as a testnet prototype.

Production versions should add, among other things:

- professional smart-contract audit
- stronger role and governance controls
- recipient identity/eligibility workflows
- organizer multisig support
- emergency pause controls
- duplicate-recipient protection if required by the product model
- robust offchain indexing
- formal accounting/property tests
- rate limits and abuse controls
- data/privacy review for any real humanitarian deployment

No sensitive personal or medical data should be written directly onchain.

## Possible next iterations

- CCTP-based crosschain campaign funding
- Circle Gateway integration
- recipient batch import from CSV
- proof-of-disbursement memo metadata
- indexed analytics with a subgraph or custom indexer
- multisig-controlled organizer treasury
- campaign milestones and tranche-based payouts
- QR-based recipient claim flow

## Builder note

I started experimenting with Arc through smaller payment and escrow prototypes. ArcRelief is the next step in that learning path: it combines Arc-native USDC, contract-level treasury accounting, multi-recipient payouts, event-driven transparency, and a frontend that reads live state directly from Arc Testnet.


## Prototype accounting safeguards

The current version deliberately constrains campaign cancellation:

- a campaign can only be cancelled before any payout has started;
- third-party contributors reclaim their own deposits with `claimCancelledRefund()`;
- organizers cannot close a campaign while an undistributed accounting balance remains.

These rules keep the demo's treasury accounting easier to reason about and prevent a cancelled third-party contribution from being redirected to the organizer.

## Additional documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/DEPLOYMENT_CHECKLIST.md`](docs/DEPLOYMENT_CHECKLIST.md)
- [`SECURITY.md`](SECURITY.md)

# Deployment Checklist

## Before deployment
- [ ] Use a dedicated testnet wallet
- [ ] Never use a wallet containing real funds
- [ ] Obtain Arc Testnet USDC
- [ ] Create `.env` from `.env.example`
- [ ] Confirm `.env` is ignored by Git
- [ ] Run `npm install`
- [ ] Run `npm run compile`

## Deployment
- [ ] Run `npm run deploy:testnet`
- [ ] Save deployed contract address
- [ ] Open contract on Arcscan
- [ ] Put address in `frontend/config.js`

## Smoke test
- [ ] Connect organizer wallet
- [ ] Create campaign
- [ ] Add two test recipients
- [ ] Fund with test USDC
- [ ] Pay recipient #0
- [ ] Pay recipient #1
- [ ] Confirm both balances/statuses
- [ ] Verify transaction links on Arcscan

## Public demo
- [ ] Push repository to GitHub
- [ ] Enable GitHub Pages from `/frontend` using a deployment workflow or publish the frontend separately
- [ ] Add live demo URL to README
- [ ] Add Arcscan contract URL to README
- [ ] Add screenshots after deployment

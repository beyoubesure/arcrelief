# GitHub Publish Checklist

This package is sanitized for public upload.

## Already removed / excluded
- `.env`
- private keys
- seed phrases
- `node_modules/`
- Hardhat `artifacts/`
- Hardhat `cache/`

## Deployed contract
`0xc22A601f248c21fEAB92B9654c37bD484D2c92b9`

Arcscan:
https://testnet.arcscan.app/address/0xc22A601f248c21fEAB92B9654c37bD484D2c92b9

## GitHub Pages
This repository contains:
`.github/workflows/pages.yml`

After pushing to the `main` branch:
1. Open GitHub repository **Settings**
2. Open **Pages**
3. Under **Build and deployment**, set **Source** to **GitHub Actions**
4. Open **Actions** and confirm `Deploy frontend to GitHub Pages` succeeds
5. The live URL will be:
   `https://<YOUR_GITHUB_USERNAME>.github.io/<REPOSITORY_NAME>/`

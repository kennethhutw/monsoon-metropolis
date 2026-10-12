# Monsoon

Compliant trade-receivables financing on **Monad Testnet**. An SME exporter turns a buyer-confirmed invoice into on-chain collateral and gets financed by a bank, with identity verification ([Cleanverse](https://cleanverse.com) CVI / CVA), AML screening and an AI-assisted review built into every step instead of bolted on.

Submission for the **Monad Metropolis Hackathon** — Trust, Identity & AI Infrastructure track (bounties: Cleanverse Verified Identity & Assets, Kimi).

- **Live app:** https://monsoon-app-alpha.vercel.app
- **Technical demo video:** https://youtu.be/PzfqfYrdKR8
- **Pitch video:** https://youtu.be/jEuHHEGvqm0
- **Pitch deck:** [`monsoon-pitch.html`](monsoon-pitch.html)

## Repository layout

| Folder | What it is |
|---|---|
| [`app/`](app/) | Next.js web app with five role-based portals (Bank, Exporter, Importer, Researcher, Admin). Start with [`app/README.md`](app/README.md). |
| [`contracts/`](contracts/) | Solidity contracts (ComplianceRegistry, InvoiceAsset, FinancingPool), tests, deployment and onboarding scripts. Start with [`contracts/README.md`](contracts/README.md). |
| [`monsoon-pitch.html`](monsoon-pitch.html) | The 5-slide pitch deck used in the pitch video — a single self-contained HTML file. Download it (or clone the repo) and open it in a browser; arrow keys / space to move, `F` for fullscreen. GitHub shows this file as source, not as a rendered page. |

### Repository note

This repository is the hackathon submission, with the whole project in one place. The live app above is deployed from [`kennethhutw/monsoon-app`](https://github.com/kennethhutw/monsoon-app), which contains the same code as `app/` here; the contracts were developed in [`kennethhutw/monsoon-contract`](https://github.com/kennethhutw/monsoon-contract), identical to `contracts/` here. The full commit history of both is in those two repositories.

## The problem

SME exporters in Asia wait 60–120 days to be paid. Paper-based invoice financing is slow, and paper does not cross-check itself: the same invoice can be pledged to two lenders at once. Monsoon puts the receivable on-chain with its hash locked at mint, so it cannot be financed twice.

## How it works

1. **Verify.** Exporters and buyers hold role-matched Cleanverse A-Pass credentials (CVI), issued through an in-app application and admin approval and mirrored on-chain in `ComplianceRegistry`.
2. **Tokenize.** A CVI-verified exporter mints the invoice as an ERC-721; the invoice hash is locked atomically with the mint. The named buyer confirms the receivable on-chain.
3. **Review.** The exporter submits it to `FinancingPool`, which locks the NFT as collateral. The bank reviewer gets an AI case assessment (Kimi K2.6, generated on demand and saved as history), an adverse-media news scan, and GoPlus wallet screening that fails closed.
4. **Settle.** The bank approves and disburses in a Cleanverse-issued A-Token (CVA), a FATF Recommendation 16 Travel Rule record is generated, and repayment settles automatically and releases the NFT.

### What is enforced where

- **In the contracts (transactions revert):** minting requires role-matched CVI for exporter and buyer; receivable transfers require a CVI-verified recipient; financing submission requires the exporter's CVI plus buyer confirmation; collateralized receivables cannot move.
- **In the app and the token:** CVA eligibility is checked live with Cleanverse `verify_apass`, and the A-Token carries a Cleanverse rule requiring holders to have a CVI.
- **Known limitation:** `FinancingPool.disburse()` and `repay()` do not re-check `ComplianceRegistry` themselves. Adding CVI checks inside them is the next hardening step.
- The AI assessment and news scan are decision support, not a substitute for formal AML or sanctions screening.

## Deployed contracts — Monad Testnet (chainId 10143)

| Contract | Address |
|---|---|
| ComplianceRegistry | [`0xaf678a90f64a41e176ad47dd8d35458448844c18`](https://testnet.monadexplorer.com/address/0xaf678a90f64a41e176ad47dd8d35458448844c18) |
| InvoiceAsset | [`0x44f839d2f4127ff28e62fbf6141745b4bc2536c7`](https://testnet.monadexplorer.com/address/0x44f839d2f4127ff28e62fbf6141745b4bc2536c7) |
| FinancingPool | [`0x6d05312906afe245a2ae8011b3d17b292ebd8551`](https://testnet.monadexplorer.com/address/0x6d05312906afe245a2ae8011b3d17b292ebd8551) |
| Settlement token (Cleanverse A-Token, CVA) | [`0x25c92CFa4444FC1387D021e7bb5C7079f7486058`](https://testnet.monadexplorer.com/address/0x25c92CFa4444FC1387D021e7bb5C7079f7486058) |

The A-Token was re-launched under the current Cleanverse App ID (a CVA cannot be managed under a different App ID) and the contracts were redeployed against it on 2026-10-12. Deployment record: [`contracts/output/deploy_monadTestnet_202610121920.txt`](contracts/output/deploy_monadTestnet_202610121920.txt).

## Run it locally

```bash
# web app (mock mode needs no wallet or external keys)
cd app
npm install
cp .env.example .env.local
npm run dev
```

```bash
# contracts
cd contracts
npm install
cp .env.example .env
npx hardhat compile
npx hardhat test
```

Demo logins, environment variables and the real-mode walkthrough are in [`app/README.md`](app/README.md) and [`app/docs/real-mode-testing-guide.md`](app/docs/real-mode-testing-guide.md).

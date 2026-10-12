# Monsoon Contracts

Smart contracts for **Monsoon** — compliant trade-receivables financing for Asia's SME exporters, gated by [Cleanverse](https://cleanverse.com) CVI (Verified Identity) and settled in a Cleanverse A-Token (CVA), on Monad Testnet.

- **App repository:** [github.com/kennethhutw/monsoon-app](https://github.com/kennethhutw/monsoon-app)
- **Live app:** https://monsoon-app-alpha.vercel.app

Submitted to the Monad Metropolis Hackathon (Trust, Identity & AI Infrastructure track); originally built for the Cleanverse Build: Trusted Assets Hackathon.

## Contracts

| Contract | File | Responsibility |
|---|---|---|
| **ComplianceRegistry** | `contracts/ComplianceRegistry.sol` | Whitelist of CVI-verified wallets: active flag, role (exporter / buyer / bank / admin), optional expiry, Cleanverse record ID. Written by an admin wallet; supports revocation and renewal. |
| **InvoiceAsset** | `contracts/InvoiceAsset.sol` | Tokenizes a buyer-confirmed receivable as an ERC-721. One invoice = one NFT, with amount, due date, both parties and financing status. The invoice hash is registered atomically with the mint, so the same invoice cannot be financed twice. |
| **FinancingPool** | `contracts/FinancingPool.sol` | Takes the NFT as collateral, approves and disburses the advance, collects repayment, settles automatically and releases the NFT. |
| **MockUSDC** | `contracts/mocks/MockUSDC.sol` | Test-only token. The deployed settlement currency is a Cleanverse-issued A-Token instead. |

### What the contracts enforce (transactions revert)

- `InvoiceAsset.mintInvoice` requires an active EXPORTER-role CVI for the minter and an active BUYER-role CVI for the named buyer wallet.
- Only the named buyer wallet can confirm or dispute the receivable.
- Receivable transfers revert unless the recipient holds a valid CVI; collateralized receivables cannot move.
- `FinancingPool.submitCase` requires an EXPORTER-role CVI and buyer confirmation before locking the NFT as collateral.
- Revoking a wallet's CVI blocks minting, transfers and financing submission immediately.

### Known limitation

`FinancingPool.disburse()` and `repay()` do not re-check `ComplianceRegistry` themselves; the CVA leg relies on the A-Token's own Cleanverse rule (holders must have a CVI) and the app's `verify_apass` check. Adding CVI checks inside those two functions is the next hardening step.

See [`docs/CONTRACTS.md`](docs/CONTRACTS.md) for the full architecture write-up (in Chinese) and [`docs/Monsoon_Contracts_PRD.md`](docs/Monsoon_Contracts_PRD.md).

## Deployed — Monad Testnet (chainId 10143)

| Contract | Address |
|---|---|
| ComplianceRegistry | [`0xaf678a90f64a41e176ad47dd8d35458448844c18`](https://testnet.monadexplorer.com/address/0xaf678a90f64a41e176ad47dd8d35458448844c18) |
| InvoiceAsset | [`0x44f839d2f4127ff28e62fbf6141745b4bc2536c7`](https://testnet.monadexplorer.com/address/0x44f839d2f4127ff28e62fbf6141745b4bc2536c7) |
| FinancingPool | [`0x6d05312906afe245a2ae8011b3d17b292ebd8551`](https://testnet.monadexplorer.com/address/0x6d05312906afe245a2ae8011b3d17b292ebd8551) |
| Settlement token (Cleanverse A-Token, CVA — symbol `mUSDC55RY4T`, 6 decimals) | [`0x25c92CFa4444FC1387D021e7bb5C7079f7486058`](https://testnet.monadexplorer.com/address/0x25c92CFa4444FC1387D021e7bb5C7079f7486058) |

Bank / deployer wallet: `0x93ff16a0dc44bc61817ede60e1c705954219877f`. Financing rate 3% annualized, advance rate 80%.

The A-Token was re-launched under the current Cleanverse App ID (a CVA cannot be managed under a different App ID) and the three contracts were redeployed against it on 2026-10-12. Earlier deployments are kept in `output/` for history. Deployment record for the current addresses: [`output/deploy_monadTestnet_202610121920.txt`](output/deploy_monadTestnet_202610121920.txt).

## Getting started

```bash
npm install
cp .env.example .env   # RPC URL and deployer key for the network you target
npx hardhat compile
npx hardhat test
```

Scripts (run from this folder):

```bash
npm run deploy:monad        # deploy the three contracts to Monad Testnet
npm run setup:atoken        # grant MINTER_ROLE and mint settlement tokens to the bank wallet
npm run deposit:liquidity   # deposit liquidity into FinancingPool
npm run onboard:exporter    # issue a Cleanverse A-Pass and register the exporter wallet
npm run onboard:buyer       # same for the buyer wallet, plus test funds for repayment
```

`scripts/` call the Cleanverse API (`CLEANVERSE_API_ID` / `CLEANVERSE_API_KEY` in `.env`) and need a funded deployer key; never commit `.env`.

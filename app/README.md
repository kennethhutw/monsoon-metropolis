# Monsoon

Compliant trade-receivables financing for Asia's SME exporters, built on **Monad Testnet**. Invoices become NFT collateral, and every step is gated by on-chain identity verification ([Cleanverse](https://cleanverse.com) CVI / CVA) and AML screening, with an AI-assisted review for the bank.

Submitted to the **Monad Metropolis Hackathon** (Trust, Identity & AI Infrastructure track) — originally built for the Cleanverse Build: Trusted Assets Hackathon (RWA track).

- **Live app:** https://monsoon-app-alpha.vercel.app
- **Smart contracts:** [github.com/kennethhutw/monsoon-contract](https://github.com/kennethhutw/monsoon-contract) (ComplianceRegistry, InvoiceAsset, FinancingPool)

## The problem

SME exporters in Asia wait 60–120 days to be paid. Paper-based invoice financing is slow, and paper does not cross-check itself: the same invoice can be pledged to two lenders at once. Monsoon puts the receivable on-chain with its hash locked at mint, so it cannot be financed twice.

## How it works

1. **Identity first.** Exporters and buyers apply for a Cleanverse A-Pass (CVI) in-app. Only an admin approval calls Cleanverse `generate_apass` and mirrors the credential on-chain in `ComplianceRegistry` with a role and the Cleanverse record ID. No personal data is stored on-chain.
2. **Tokenize.** A CVI-verified exporter mints the invoice as an ERC-721. The invoice hash is registered atomically with the mint. The named buyer confirms the receivable on-chain.
3. **Review.** The exporter submits the confirmed receivable to `FinancingPool`, which locks the NFT as collateral. The bank reviewer sees an AI case assessment (recommendation, key risk points, next step — generated on demand with Kimi K2.6 and saved as history), an adverse-media news scan, and GoPlus wallet screening that fails closed.
4. **Settle.** The bank approves and disburses in a Cleanverse-issued A-Token (CVA). A FATF Recommendation 16 Travel Rule record is generated at disbursement and repayment. On repayment the pool settles automatically and releases the NFT.

### What is enforced where

- **In the contracts (transactions revert):** minting requires role-matched CVI for both the exporter and the buyer; receivable transfers require the recipient to hold a valid CVI; financing submission requires the exporter's CVI and buyer confirmation; collateralized receivables cannot move.
- **In the app / token:** CVA eligibility is checked live with Cleanverse `verify_apass`, and the A-Token itself carries a Cleanverse rule requiring holders to have a CVI.
- **Known limitation:** `FinancingPool.disburse()` and `repay()` do not re-check `ComplianceRegistry` themselves. Adding CVI checks inside those two functions is the next hardening step.
- The AI assessment and news scan are decision support, not a substitute for formal AML or sanctions screening. Travel Rule records are generated records, not a live VASP-to-VASP network.

## Architecture

- **Next.js 16** (App Router) + TypeScript — one web app with five role-based portals (Bank, Exporter, Importer, Researcher, Admin).
- **Two contract modes**, switched by `NEXT_PUBLIC_CONTRACT_MODE`:
  - `mock` — self-contained demo, no wallet needed, deterministic data. The UI labels anything simulated as Demo Mode.
  - `real` — reads and writes the deployed Monad Testnet contracts. Role-specific actions (exporter mints, buyer confirms and repays, bank approves and disburses) are signed by the user's own wallet; the platform key is used only for admin CVI registration.
- **Auth:** server-side signed session cookie; all `/api/admin/**` routes are role-guarded.
- **AI:** a provider layer (Anthropic or OpenRouter). Case assessment can run on Kimi K2.6 via `CASE_AI_MODEL=kimi`. Adverse-media scan uses Exa for search.
- **Supabase:** cases, risk profiles, chain records, alerts, audit log, Travel Rule records, AI assessment and news-scan history (`supabase/migrations/`).
- **Admin health:** `/admin/health` makes a live chain call; the RPC provider can be switched with `RPC_PROVIDER=default|alchemy` (server-side only, does not affect wallet connections).

## Deployed contracts — Monad Testnet (chainId 10143)

| Contract | Address |
|---|---|
| ComplianceRegistry | [`0xaf678a90f64a41e176ad47dd8d35458448844c18`](https://testnet.monadexplorer.com/address/0xaf678a90f64a41e176ad47dd8d35458448844c18) |
| InvoiceAsset | [`0x44f839d2f4127ff28e62fbf6141745b4bc2536c7`](https://testnet.monadexplorer.com/address/0x44f839d2f4127ff28e62fbf6141745b4bc2536c7) |
| FinancingPool | [`0x6d05312906afe245a2ae8011b3d17b292ebd8551`](https://testnet.monadexplorer.com/address/0x6d05312906afe245a2ae8011b3d17b292ebd8551) |
| Settlement token (Cleanverse A-Token, CVA) | [`0x25c92CFa4444FC1387D021e7bb5C7079f7486058`](https://testnet.monadexplorer.com/address/0x25c92CFa4444FC1387D021e7bb5C7079f7486058) |

The A-Token was re-launched under the current Cleanverse App ID (Cleanverse does not allow a CVA to be managed under a different App ID), and the contracts were redeployed against it.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values described below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See [`.env.example`](.env.example) for the full list. At minimum:

- `NEXT_PUBLIC_CONTRACT_MODE=mock` to run without a wallet or external API keys.
- `SESSION_SECRET` — any long random string; signs the login session.
- An AI key for the AI features (`ANTHROPIC_API_KEY`, or `AI_PROVIDER=openrouter` with `OPENROUTER_API_KEY`). Without one the AI panels show a clear "unavailable" fallback.
- Supabase keys for real case persistence instead of mock data (schema in `supabase/migrations/`).
- Real mode only: the four contract addresses above, `ADMIN_PRIVATE_KEY`, `CLEANVERSE_API_ID` / `CLEANVERSE_API_KEY`, `GOPLUS_API_KEY` / `GOPLUS_API_SECRET`, and `EXA_API_KEY` for the news scan.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Bank | `bank@monsoon.demo` | `demo1234` |
| Exporter | `exporter@monsoon.demo` | `demo1234` |
| Importer | `importer@monsoon.demo` | `demo1234` |
| Researcher | `researcher@monsoon.demo` | `demo1234` |
| Admin | `admin@monsoon.demo` | `admin5678` |

Real on-chain actions (mint, confirm, finance, repay) need MetaMask on Monad Testnet and a wallet registered in `ComplianceRegistry`; see [`docs/real-mode-testing-guide.md`](docs/real-mode-testing-guide.md).

## Project docs

- [`docs/DESIGN.md`](docs/DESIGN.md) — design system reference
- [`docs/real-mode-testing-guide.md`](docs/real-mode-testing-guide.md) — end-to-end real-mode walkthrough
- [`docs/changes/`](docs/changes/) — dated change-record log

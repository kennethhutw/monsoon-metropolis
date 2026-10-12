Deploying with account: 0x93ff16a0dc44bc61817ede60e1c705954219877f
Account balance: 10

ComplianceRegistry deployed to: 0x936510cc9a2ae6ef25aab578693c34a0853420af
InvoiceAsset deployed to:       0xdef7633094bd92092028ddb1a272a59be3be48cc
MockUSDC deployed to:           0x4896530d9b90fe8b480bcfb9301cbcaf6626af13  (no MOCK_USDC_ADDRESS set)
FinancingPool deployed to:      0xfa27fe3dbaca0e12240abe1f5bfa56fb55e1cc1b

Wiring contracts...
  InvoiceAsset.setFinancingPool(0xfa27fe3dbaca0e12240abe1f5bfa56fb55e1cc1b)
  ComplianceRegistry.setAdmin(0x93ff16a0dc44bc61817ede60e1c705954219877f, true)
  Skipped bank CVI registration — BANK_WALLET_ADDRESS not set, deployer is standing in as the bank wallet.

=== Deployment Summary ===
ComplianceRegistry: 0x936510cc9a2ae6ef25aab578693c34a0853420af
InvoiceAsset:       0xdef7633094bd92092028ddb1a272a59be3be48cc
FinancingPool:      0xfa27fe3dbaca0e12240abe1f5bfa56fb55e1cc1b
Stablecoin:         0x4896530d9b90fe8b480bcfb9301cbcaf6626af13
Bank wallet:        0x93ff16a0dc44bc61817ede60e1c705954219877f

Add these to Monsoon_App/.env.local:
NEXT_PUBLIC_COMPLIANCE_REGISTRY=0x936510cc9a2ae6ef25aab578693c34a0853420af
NEXT_PUBLIC_INVOICE_ASSET=0xdef7633094bd92092028ddb1a272a59be3be48cc
NEXT_PUBLIC_FINANCING_POOL=0xfa27fe3dbaca0e12240abe1f5bfa56fb55e1cc1b
NEXT_PUBLIC_STABLECOIN=0x4896530d9b90fe8b480bcfb9301cbcaf6626af13
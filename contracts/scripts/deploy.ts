import { network } from "hardhat";
import { formatEther, zeroHash, type Address } from "viem";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Deployment order per PRD §5.1:
//   1. ComplianceRegistry (no dependencies)
//   2. InvoiceAsset       (depends on ComplianceRegistry)
//   3. FinancingPool      (depends on ComplianceRegistry + InvoiceAsset)
// Post-deploy: wire InvoiceAsset -> FinancingPool, grant deployer admin,
// register the initial bank wallet's CVI.

const RoleType = { NONE: 0, EXPORTER: 1, BUYER: 2, BANK: 3, ADMIN: 4 } as const;
const ADVANCE_RATE_BPS = 8000n; // 80%
const FINANCING_RATE_BPS = 300n; // 3% annualized

const EXPLORERS: Record<string, string> = {
  monadTestnet: "https://testnet.monadexplorer.com/address/",
  baseTestnet: "https://sepolia.basescan.org/address/",
};

// YYYYMMDDhhmm, local time
function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes())
  );
}

async function main() {
  const connection = await network.create();
  const { viem, networkName } = connection;
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const send = async (hash: `0x${string}`, label: string) => {
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ${label}`);
  };

  console.log(`Deploying with account: ${deployer.account.address}`);
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`Account balance: ${formatEther(balance)}\n`);

  // ── 1. ComplianceRegistry ────────────────────────────────────
  const registry = await viem.deployContract("ComplianceRegistry", [deployer.account.address]);
  console.log(`ComplianceRegistry deployed to: ${registry.address}`);

  // ── 2. InvoiceAsset ──────────────────────────────────────────
  const invoiceAsset = await viem.deployContract("InvoiceAsset", [deployer.account.address, registry.address]);
  console.log(`InvoiceAsset deployed to:       ${invoiceAsset.address}`);

  // Stablecoin: reuse MOCK_USDC_ADDRESS from env if set, otherwise deploy a
  // fresh MockUSDC (Monad/Base testnets don't have a canonical USDC yet).
  const envUsdc = process.env.MOCK_USDC_ADDRESS;
  let usdcAddress: Address;
  if (envUsdc !== undefined && envUsdc !== "" && envUsdc !== "0x_TODO") {
    usdcAddress = envUsdc as Address;
    console.log(`Using existing stablecoin at:   ${usdcAddress}`);
  } else {
    const mockUsdc = await viem.deployContract("MockUSDC", []);
    usdcAddress = mockUsdc.address;
    console.log(`MockUSDC deployed to:           ${usdcAddress}  (no MOCK_USDC_ADDRESS set)`);
  }

  const bankWallet = ((process.env.BANK_WALLET_ADDRESS ?? deployer.account.address) as Address);

  // ── 3. FinancingPool ─────────────────────────────────────────
  const financingPool = await viem.deployContract("FinancingPool", [
    deployer.account.address,
    registry.address,
    invoiceAsset.address,
    usdcAddress,
    bankWallet,
    FINANCING_RATE_BPS,
    ADVANCE_RATE_BPS,
  ]);
  console.log(`FinancingPool deployed to:      ${financingPool.address}`);

  // ── Post-deployment wiring ───────────────────────────────────
  console.log("\nWiring contracts...");

  await send(
    await invoiceAsset.write.setFinancingPool([financingPool.address]),
    `InvoiceAsset.setFinancingPool(${financingPool.address})`,
  );

  await send(
    await registry.write.setAdmin([deployer.account.address, true]),
    `ComplianceRegistry.setAdmin(${deployer.account.address}, true)`,
  );

  if (bankWallet.toLowerCase() !== deployer.account.address.toLowerCase()) {
    await send(
      await registry.write.registerCVI([bankWallet, RoleType.BANK, "cvi-bank-genesis", zeroHash, 0n]),
      `ComplianceRegistry.registerCVI(bankWallet=${bankWallet}, BANK)`,
    );
  } else {
    console.log(
      "  Skipped bank CVI registration — BANK_WALLET_ADDRESS not set, deployer is standing in as the bank wallet.",
    );
  }

  const explorerBase = EXPLORERS[networkName];
  const explorerLink = (addr: string) => (explorerBase ? `${explorerBase}${addr}` : "(no block explorer configured for this network)");

  console.log("\n=== Deployment Summary ===");
  console.log(`ComplianceRegistry: ${registry.address}`);
  console.log(`InvoiceAsset:       ${invoiceAsset.address}`);
  console.log(`FinancingPool:      ${financingPool.address}`);
  console.log(`Stablecoin:         ${usdcAddress}`);
  console.log(`Bank wallet:        ${bankWallet}`);
  console.log("\nAdd these to Monsoon_App/.env.local:");
  console.log(`NEXT_PUBLIC_COMPLIANCE_REGISTRY=${registry.address}`);
  console.log(`NEXT_PUBLIC_INVOICE_ASSET=${invoiceAsset.address}`);
  console.log(`NEXT_PUBLIC_FINANCING_POOL=${financingPool.address}`);
  console.log(`NEXT_PUBLIC_STABLECOIN=${usdcAddress}`);

  // ── Write a timestamped record to output/ ───────────────────
  const outputDir = join(process.cwd(), "output");
  mkdirSync(outputDir, { recursive: true });
  const stamp = timestamp();
  const outputPath = join(outputDir, `deploy_${networkName}_${stamp}.txt`);

  const report = [
    `Monsoon Contracts — Deployment Record`,
    `Generated: ${new Date().toISOString()}`,
    `Network:   ${networkName}`,
    `Deployer:  ${deployer.account.address}`,
    ``,
    `=== Contract Addresses ===`,
    `ComplianceRegistry: ${registry.address}`,
    `  ${explorerLink(registry.address)}`,
    `InvoiceAsset:       ${invoiceAsset.address}`,
    `  ${explorerLink(invoiceAsset.address)}`,
    `FinancingPool:      ${financingPool.address}`,
    `  ${explorerLink(financingPool.address)}`,
    `Stablecoin:         ${usdcAddress}`,
    `  ${explorerLink(usdcAddress)}`,
    `Bank wallet:        ${bankWallet}`,
    ``,
    `=== Parameters ===`,
    `Financing rate (bps): ${FINANCING_RATE_BPS}`,
    `Advance rate (bps):   ${ADVANCE_RATE_BPS}`,
    ``,
    `=== Add to Monsoon_App/.env.local ===`,
    `NEXT_PUBLIC_COMPLIANCE_REGISTRY=${registry.address}`,
    `NEXT_PUBLIC_INVOICE_ASSET=${invoiceAsset.address}`,
    `NEXT_PUBLIC_FINANCING_POOL=${financingPool.address}`,
    `NEXT_PUBLIC_STABLECOIN=${usdcAddress}`,
    ``,
  ].join("\n");

  writeFileSync(outputPath, report, "utf-8");
  console.log(`\nDeployment record written to: ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

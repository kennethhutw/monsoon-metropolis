// 用銀行錢包把 mUSDC 存進 FinancingPool 資金池。
// 執行：npm run deposit:liquidity
//
// 自動讀取 output/ 底下最新一份 deploy_monadTestnet_*.txt 取得 FinancingPool
// 地址（deploy.ts 每次部署都會產生一份），不需要手動複製貼上。

import { network } from "hardhat";
import { formatUnits, getContract, type Address } from "viem";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureApass } from "./lib/cleanverseApass";

const DEPOSIT_AMOUNT = 250_000_000_000n; // 250,000 mUSDC (6 decimals) — matches setup-atoken.ts's mint amount

const erc20Abi = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

function latestDeployRecord(networkName: string): { financingPool: Address; stablecoin: Address } {
  const outputDir = join(process.cwd(), "output");
  const files = readdirSync(outputDir)
    .filter((f) => f.startsWith(`deploy_${networkName}_`) && f.endsWith(".txt"))
    .sort();
  const latest = files.at(-1);
  if (!latest) throw new Error(`No deploy_${networkName}_*.txt found in output/ — run npm run deploy:monad first`);

  const content = readFileSync(join(outputDir, latest), "utf-8");
  const financingPool = content.match(/FinancingPool:\s+(0x[0-9a-fA-F]{40})/)?.[1] as Address | undefined;
  const stablecoin = content.match(/Stablecoin:\s+(0x[0-9a-fA-F]{40})/)?.[1] as Address | undefined;
  if (!financingPool || !stablecoin) throw new Error(`Could not parse FinancingPool/Stablecoin address out of output/${latest}`);

  console.log(`Using addresses from output/${latest}`);
  return { financingPool, stablecoin };
}

async function main() {
  const connection = await network.create();
  const { viem, networkName } = connection;
  const [bank] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const { financingPool: financingPoolAddress, stablecoin } = latestDeployRecord(networkName);

  console.log(`Bank wallet:    ${bank.account.address}`);
  console.log(`FinancingPool:  ${financingPoolAddress}`);
  console.log(`Stablecoin:     ${stablecoin}`);
  console.log("");

  // The A-Token's compliance rule (min_tier) is enforced on every transfer,
  // including transfers TO a contract address — FinancingPool itself needs
  // a registered A-Pass before it can receive deposited liquidity.
  await ensureApass(financingPoolAddress, "FinancingPool contract");

  const usdc = getContract({ address: stablecoin, abi: erc20Abi, client: { public: publicClient, wallet: bank } });
  const financingPool = await viem.getContractAt("FinancingPool", financingPoolAddress, {
    client: { public: publicClient, wallet: bank },
  });

  const allowance = await usdc.read.allowance([bank.account.address, financingPoolAddress]);
  if (allowance < DEPOSIT_AMOUNT) {
    console.log(`Approving FinancingPool to spend ${formatUnits(DEPOSIT_AMOUNT, 6)} mUSDC...`);
    const approveHash = await usdc.write.approve([financingPoolAddress, DEPOSIT_AMOUNT]);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log(`  done (${approveHash})`);
  } else {
    console.log("Allowance already sufficient — skipping approve.");
  }

  console.log(`Depositing ${formatUnits(DEPOSIT_AMOUNT, 6)} mUSDC into FinancingPool...`);
  const depositHash = await financingPool.write.depositLiquidity([DEPOSIT_AMOUNT]);
  await publicClient.waitForTransactionReceipt({ hash: depositHash });
  console.log(`  done (${depositHash})`);

  const poolBalance = await financingPool.read.getPoolBalance();
  const bankBalance = await usdc.read.balanceOf([bank.account.address]);
  console.log("");
  console.log(`FinancingPool liquidity: ${formatUnits(poolBalance, 6)} mUSDC`);
  console.log(`Bank wallet remaining:   ${formatUnits(bankBalance, 6)} mUSDC`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

// 一次性設定 Cleanverse 發行的 A-Token(CVA)：
//   1. 幫銀行錢包在 Cleanverse 註冊一個真實 A-Pass(mint 前置合規檢查需要)
//   2. 授予 deployer 錢包 MINTER_ROLE(它已經是 DEFAULT_ADMIN_ROLE,可以自己 grant)
//   3. 鑄一筆示範用流動性到 bank wallet,讓 FinancingPool.depositLiquidity 有東西可以存
//
// 執行：npm run setup:atoken
// 前提：
//   - MOCK_USDC_ADDRESS 在 .env 已指向 Cleanverse 發行的 A-Token(不是舊 MockUSDC)
//   - CLEANVERSE_API_ID / CLEANVERSE_API_KEY 已填(跟 Monsoon_App/.env.local 同一組)
//
// ABI 只涵蓋標準 OpenZeppelin AccessControl + Mintable-ERC20 介面 —— 這顆合約是
// Cleanverse 部署的,不是我們自己的合約,沒有本地 artifact,已用 simulateContract
// 驗證過 mint()/grantRole() 的函式簽章與 revert 行為(見對話紀錄)。

import { network } from "hardhat";
import { formatUnits, getContract, type Address } from "viem";
import { ensureApass } from "./lib/cleanverseApass";

const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6" as const;
const DEMO_LIQUIDITY = 250_000_000_000n; // 250,000 mUSDC (6 decimals) — matches mock.ts's demo pool balance

const atokenAbi = [
  { type: "function", name: "hasRole", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "grantRole", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const atokenAddress = process.env.MOCK_USDC_ADDRESS as Address | undefined;
  if (!atokenAddress || atokenAddress === "0x_TODO") {
    throw new Error("MOCK_USDC_ADDRESS 未設定 — 請先確認 .env 指向 Cleanverse 發行的 A-Token 地址");
  }

  const connection = await network.create();
  const { viem } = connection;
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const bankWallet = (process.env.BANK_WALLET_ADDRESS ?? deployer.account.address) as Address;

  console.log(`A-Token:  ${atokenAddress}`);
  console.log(`Deployer: ${deployer.account.address}`);
  console.log(`Bank:     ${bankWallet}`);
  console.log("");

  await ensureApass(bankWallet, "Bank wallet");

  const atoken = getContract({
    address: atokenAddress,
    abi: atokenAbi,
    client: { public: publicClient, wallet: deployer },
  });

  const alreadyMinter = await atoken.read.hasRole([MINTER_ROLE, deployer.account.address]);
  if (alreadyMinter) {
    console.log("Deployer already has MINTER_ROLE — skipping grant.");
  } else {
    console.log("Granting MINTER_ROLE to deployer...");
    const hash = await atoken.write.grantRole([MINTER_ROLE, deployer.account.address]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  done (${hash})`);
  }

  console.log(`Minting ${formatUnits(DEMO_LIQUIDITY, 6)} mUSDC to bank wallet...`);
  const mintHash = await atoken.write.mint([bankWallet, DEMO_LIQUIDITY]);
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  console.log(`  done (${mintHash})`);

  const balance = await atoken.read.balanceOf([bankWallet]);
  console.log("");
  console.log(`Bank wallet mUSDC balance: ${formatUnits(balance, 6)}`);
  console.log("");
  console.log("下一步：npm run deposit:liquidity 把這筆錢存進資金池。");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

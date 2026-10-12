// 幫一個測試錢包完成上鏈測試前置準備：
//   1. 註冊 Cleanverse A-Pass(真實 CVI)
//   2. 註冊我們自己 ComplianceRegistry 的 CVI(對應角色)
//   3. 如果是 buyer,順便鑄一筆 mUSDC 給它(之後才有錢可以還款)
//
// 共用邏輯 — 實際入口是 onboard-exporter.ts / onboard-buyer.ts,
// 各自讀自己的 .env 變數(EXPORTER_WALLET_ADDRESS / BUYER_WALLET_ADDRESS),
// 角色由呼叫的 script 決定,不會設錯。

import { network } from "hardhat";
import { getContract, zeroHash, type Address } from "viem";
import { ensureApass } from "./cleanverseApass";
import { latestDeployRecord } from "./deployRecord";

const ROLE_MAP = { exporter: 1, buyer: 2 } as const; // ComplianceRegistry.RoleType
const BUYER_FUNDING = 5_000_000_000n; // 5,000 mUSDC — plenty to cover a demo repayment

const atokenAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
] as const;

export async function onboardWallet(walletAddress: Address, role: "exporter" | "buyer") {
  const connection = await network.create();
  const { viem, networkName } = connection;
  const [admin] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const { complianceRegistry: registryAddress, stablecoin } = latestDeployRecord(networkName);

  console.log(`Wallet:  ${walletAddress}`);
  console.log(`Role:    ${role}`);
  console.log(`Admin:   ${admin.account.address}`);
  console.log("");

  // ── 1. Cleanverse A-Pass ─────────────────────────────────────
  await ensureApass(walletAddress, `${role} wallet`, 50);

  // ── 2. ComplianceRegistry CVI ────────────────────────────────
  const registry = await viem.getContractAt("ComplianceRegistry", registryAddress, {
    client: { public: publicClient, wallet: admin },
  });
  const isVerified = await registry.read.isVerifiedAs([walletAddress, ROLE_MAP[role]]);
  if (isVerified) {
    console.log("Already CVI-verified in ComplianceRegistry — skipping registerCVI.");
  } else {
    console.log("Registering CVI in ComplianceRegistry...");
    const hash = await registry.write.registerCVI([
      walletAddress,
      ROLE_MAP[role],
      `cvi-${role}-onboard`,
      zeroHash,
      0n,
    ]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  done (${hash})`);
  }

  // ── 3. Fund buyer with mUSDC for repayment ──────────────────
  if (role === "buyer") {
    const atoken = getContract({ address: stablecoin, abi: atokenAbi, client: { public: publicClient, wallet: admin } });
    console.log(`Minting ${BUYER_FUNDING / 1_000_000n} mUSDC to buyer wallet...`);
    const hash = await atoken.write.mint([walletAddress, BUYER_FUNDING]);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  done (${hash})`);
  }

  console.log("");
  console.log(`✅ ${walletAddress} is ready to use as the ${role} wallet.`);
}

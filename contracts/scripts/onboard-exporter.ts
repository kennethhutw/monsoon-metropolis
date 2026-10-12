// 幫 Exporter 測試錢包做 CVI 準備。
// 執行：npm run onboard:exporter
// 讀取 .env 的 EXPORTER_WALLET_ADDRESS

import type { Address } from "viem";
import { onboardWallet } from "./lib/onboardWallet";

const walletAddress = process.env.EXPORTER_WALLET_ADDRESS as Address | undefined;
if (!walletAddress) {
  throw new Error("請在 .env 設定 EXPORTER_WALLET_ADDRESS=0x...");
}

onboardWallet(walletAddress, "exporter").catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

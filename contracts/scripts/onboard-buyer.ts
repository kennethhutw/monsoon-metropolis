// 幫 Importer(買方)測試錢包做 CVI 準備 + 鑄 mUSDC 給它還款用。
// 執行：npm run onboard:buyer
// 讀取 .env 的 BUYER_WALLET_ADDRESS

import type { Address } from "viem";
import { onboardWallet } from "./lib/onboardWallet";

const walletAddress = process.env.BUYER_WALLET_ADDRESS as Address | undefined;
if (!walletAddress) {
  throw new Error("請在 .env 設定 BUYER_WALLET_ADDRESS=0x...");
}

onboardWallet(walletAddress, "buyer").catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

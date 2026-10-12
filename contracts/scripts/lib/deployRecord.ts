// Shared helper — reads the latest deploy_{network}_*.txt in output/ so
// scripts don't need addresses copy-pasted into .env by hand.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Address } from "viem";

export interface DeployedAddresses {
  complianceRegistry: Address;
  invoiceAsset: Address;
  financingPool: Address;
  stablecoin: Address;
}

export function latestDeployRecord(networkName: string): DeployedAddresses {
  const outputDir = join(process.cwd(), "output");
  const files = readdirSync(outputDir)
    .filter((f) => f.startsWith(`deploy_${networkName}_`) && f.endsWith(".txt"))
    .sort();
  const latest = files.at(-1);
  if (!latest) throw new Error(`No deploy_${networkName}_*.txt found in output/ — run npm run deploy:monad first`);

  const content = readFileSync(join(outputDir, latest), "utf-8");
  const pick = (label: string) => content.match(new RegExp(`${label}:\\s+(0x[0-9a-fA-F]{40})`))?.[1] as Address | undefined;

  const complianceRegistry = pick("ComplianceRegistry");
  const invoiceAsset = pick("InvoiceAsset");
  const financingPool = pick("FinancingPool");
  const stablecoin = pick("Stablecoin");
  if (!complianceRegistry || !invoiceAsset || !financingPool || !stablecoin) {
    throw new Error(`Could not parse all contract addresses out of output/${latest}`);
  }

  console.log(`Using addresses from output/${latest}`);
  return { complianceRegistry, invoiceAsset, financingPool, stablecoin };
}

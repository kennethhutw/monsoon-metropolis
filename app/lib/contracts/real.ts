// Real Monad Testnet contract interaction — CONTRACT_MODE=real
//
// Server-only module: getAdminWalletClient() reads ADMIN_PRIVATE_KEY, so this
// file must only be imported from Route Handlers (app/api/**/route.ts), never
// from a 'use client' component. The `import 'server-only'` below turns any
// accidental client import into a build error.
//
// Scope note: ComplianceRegistry's registerCVI/revokeCVI/renewCVI are
// onlyAdmin, so they're genuinely callable here with a platform-held key —
// this stands in for "Cleanverse oracle issues CVI" per the contract's own
// TODO. Functions that require a specific counterparty's own signature
// (mintInvoice as exporter, submitCase/confirmReceivable/approveCase/disburse/
// repay) cannot be done with a shared backend key without misrepresenting
// whose wallet signed the transaction. Those are implemented client-side in
// walletActions.ts instead, called directly from page components with the
// user's own connected wallet (see hooks/useWallet.ts) — the stubs below only
// exist so this module keeps a uniform shape for the few server-side callers
// (the /api/contracts/* routes) that still reference them.

import 'server-only'
import { keccak256, toHex, zeroHash, type Address, type Hash } from 'viem'
import { publicClient, contractAddresses, getAdminWalletClient } from './config'
import { complianceRegistryAbi } from './abis/complianceRegistry'
import { invoiceAssetAbi } from './abis/invoiceAsset'
import { financingPoolAbi } from './abis/financingPool'
import { RoleType, type RoleTypeValue, type CVIRecord } from './types'

export { RoleType }
export type { RoleTypeValue, CVIRecord }

export const realContracts = {
  // ── ComplianceRegistry (reads) ──────────────────────────────────

  async isVerified(wallet: Address): Promise<boolean> {
    return publicClient.readContract({
      address: contractAddresses.complianceRegistry,
      abi: complianceRegistryAbi,
      functionName: 'isVerified',
      args: [wallet],
    })
  },

  async isVerifiedAs(wallet: Address, role: RoleTypeValue): Promise<boolean> {
    return publicClient.readContract({
      address: contractAddresses.complianceRegistry,
      abi: complianceRegistryAbi,
      functionName: 'isVerifiedAs',
      args: [wallet, role],
    })
  },

  async getCVIRecord(wallet: Address): Promise<CVIRecord> {
    const record = await publicClient.readContract({
      address: contractAddresses.complianceRegistry,
      abi: complianceRegistryAbi,
      functionName: 'getCVIRecord',
      args: [wallet],
    })
    return record as unknown as CVIRecord
  },

  // ── ComplianceRegistry (admin-signed writes) ────────────────────

  /** Issues an on-chain CVI credential. Called by the platform after KYB approval. */
  async registerCVI(
    wallet: Address,
    role: RoleTypeValue,
    cviTokenId: string,
    kybDataHash: Hash = zeroHash,
    expiresAt = 0n,
  ): Promise<{ txHash: Hash }> {
    const admin = getAdminWalletClient()
    const txHash = await admin.writeContract({
      address: contractAddresses.complianceRegistry,
      abi: complianceRegistryAbi,
      functionName: 'registerCVI',
      args: [wallet, role, cviTokenId, kybDataHash, expiresAt],
    })
    await publicClient.waitForTransactionReceipt({ hash: txHash })
    return { txHash }
  },

  async revokeCVI(wallet: Address, reason: string): Promise<{ txHash: Hash }> {
    const admin = getAdminWalletClient()
    const txHash = await admin.writeContract({
      address: contractAddresses.complianceRegistry,
      abi: complianceRegistryAbi,
      functionName: 'revokeCVI',
      args: [wallet, reason],
    })
    await publicClient.waitForTransactionReceipt({ hash: txHash })
    return { txHash }
  },

  // ── InvoiceAsset (reads) ─────────────────────────────────────────

  /** Anti-double-financing check: has this invoice hash already been minted? */
  async isHashDuplicate(invoiceHash: Hash): Promise<boolean> {
    return publicClient.readContract({
      address: contractAddresses.invoiceAsset,
      abi: invoiceAssetAbi,
      functionName: 'isHashDuplicate',
      args: [invoiceHash],
    })
  },

  hashInvoiceRef(companyId: string, invoiceNumber: string, amount: string): Hash {
    return keccak256(toHex(`${companyId}:${invoiceNumber}:${amount}`))
  },

  async getInvoiceData(tokenId: bigint) {
    return publicClient.readContract({
      address: contractAddresses.invoiceAsset,
      abi: invoiceAssetAbi,
      functionName: 'getInvoiceData',
      args: [tokenId],
    })
  },

  // ── FinancingPool (reads) ────────────────────────────────────────

  async getCase(caseId: bigint) {
    return publicClient.readContract({
      address: contractAddresses.financingPool,
      abi: financingPoolAbi,
      functionName: 'getCase',
      args: [caseId],
    })
  },

  async getPoolBalance(): Promise<bigint> {
    return publicClient.readContract({
      address: contractAddresses.financingPool,
      abi: financingPoolAbi,
      functionName: 'getPoolBalance',
    })
  },

  async calculateAdvanceAmount(invoiceAmount: bigint): Promise<bigint> {
    return publicClient.readContract({
      address: contractAddresses.financingPool,
      abi: financingPoolAbi,
      functionName: 'calculateAdvanceAmount',
      args: [invoiceAmount],
    })
  },

  async calculateRepaymentAmount(advanceAmount: bigint, tenureDays: bigint): Promise<bigint> {
    return publicClient.readContract({
      address: contractAddresses.financingPool,
      abi: financingPoolAbi,
      functionName: 'calculateRepaymentAmount',
      args: [advanceAmount, tenureDays],
    })
  },

  // ── Wallet-required actions ──────────────────────────────────────
  // These exist here only so server-side callers (API routes) fail with a
  // clear message. The real implementations live in walletActions.ts and
  // are called directly from client components with the user's own
  // wagmi-connected wallet — see hooks/useWallet.ts.

  async mintInvoice(): Promise<never> {
    throw new Error(
      "mintInvoice must be called client-side via lib/contracts/walletActions.ts with the exporter's own connected wallet",
    )
  },
  async submitCase(): Promise<never> {
    throw new Error(
      "submitCase must be called client-side via lib/contracts/walletActions.ts with the exporter's own connected wallet",
    )
  },
  async approveCase(): Promise<never> {
    throw new Error(
      "approveCase must be called client-side via lib/contracts/walletActions.ts with the bank's own connected wallet",
    )
  },
  async disburse(): Promise<never> {
    throw new Error(
      "disburse must be called client-side via lib/contracts/walletActions.ts with the bank's own connected wallet",
    )
  },
  async repay(): Promise<never> {
    throw new Error(
      "repay must be called client-side via lib/contracts/walletActions.ts with the buyer's own connected wallet",
    )
  },
}

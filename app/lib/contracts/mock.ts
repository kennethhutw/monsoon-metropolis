// 🔵 MOCK 合約互動 — 不需 MetaMask
// Mirrors the real-mode function set in real.ts (same names/shapes) so
// switching NEXT_PUBLIC_CONTRACT_MODE doesn't change call sites.

import { keccak256, toHex, type Address, type Hash } from 'viem'
import { RoleType, type RoleTypeValue, type CVIRecord } from './types'

const mockTxHash = (label: string): Hash => `0xMOCK_${label}_${Date.now().toString(16).toUpperCase()}` as Hash

const registeredHashes = new Set<string>()
const cviRecords = new Map<Address, CVIRecord>()

export { RoleType }

export const mockContracts = {
  async isVerified(_wallet: Address): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200))
    return true // Mock 模式：所有地址預設已驗證
  },

  async isVerifiedAs(_wallet: Address, _role: RoleTypeValue): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200))
    return true
  },

  async getCVIRecord(wallet: Address): Promise<CVIRecord> {
    await new Promise((r) => setTimeout(r, 200))
    return (
      cviRecords.get(wallet) ?? {
        isActive: true,
        issuedAt: BigInt(Math.floor(Date.now() / 1000) - 86400),
        expiresAt: 0n,
        cviTokenId: 'cvi-mock-demo',
        kybDataHash: keccak256(toHex('mock-kyb-data')),
        role: RoleType.EXPORTER,
      }
    )
  },

  async registerCVI(
    wallet: Address,
    role: RoleTypeValue,
    cviTokenId: string,
    kybDataHash: Hash = keccak256(toHex('mock-kyb-data')),
    expiresAt = 0n,
  ): Promise<{ txHash: Hash }> {
    await new Promise((r) => setTimeout(r, 800))
    cviRecords.set(wallet, {
      isActive: true,
      issuedAt: BigInt(Math.floor(Date.now() / 1000)),
      expiresAt,
      cviTokenId,
      kybDataHash,
      role,
    })
    return { txHash: mockTxHash('CVI') }
  },

  async revokeCVI(wallet: Address, _reason: string): Promise<{ txHash: Hash }> {
    await new Promise((r) => setTimeout(r, 500))
    const record = cviRecords.get(wallet)
    if (record) record.isActive = false
    return { txHash: mockTxHash('REVOKE') }
  },

  async isHashDuplicate(invoiceHash: Hash): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 400))
    return registeredHashes.has(invoiceHash)
  },

  hashInvoiceRef(companyId: string, invoiceNumber: string, amount: string): Hash {
    return keccak256(toHex(`${companyId}:${invoiceNumber}:${amount}`))
  },

  async getInvoiceData(_tokenId: bigint) {
    await new Promise((r) => setTimeout(r, 300))
    return null
  },

  async getCase(_caseId: bigint) {
    await new Promise((r) => setTimeout(r, 300))
    return null
  },

  async getPoolBalance(): Promise<bigint> {
    return 250_000_000_000n // 250,000 USDC (6 decimals) — matches demo pool sizing
  },

  async calculateAdvanceAmount(invoiceAmount: bigint): Promise<bigint> {
    return (invoiceAmount * 8000n) / 10000n // 80% advance rate, matches deploy.ts default
  },

  async calculateRepaymentAmount(advanceAmount: bigint, tenureDays: bigint): Promise<bigint> {
    const interest = (advanceAmount * 300n * tenureDays) / (10000n * 365n) // 3% annualized
    return advanceAmount + interest
  },

  async mintInvoice(): Promise<{ txHash: Hash; tokenId: number }> {
    await new Promise((r) => setTimeout(r, 1000))
    return { txHash: mockTxHash('MINT'), tokenId: Math.floor(Math.random() * 10000) }
  },
  async submitCase(): Promise<{ txHash: Hash; caseId: number }> {
    await new Promise((r) => setTimeout(r, 800))
    return { txHash: mockTxHash('CASE'), caseId: Math.floor(Math.random() * 10000) }
  },
  async approveCase(): Promise<{ txHash: Hash }> {
    await new Promise((r) => setTimeout(r, 600))
    return { txHash: mockTxHash('APPROVE') }
  },
  async disburse(): Promise<{ txHash: Hash }> {
    await new Promise((r) => setTimeout(r, 800))
    return { txHash: mockTxHash('DISBURSE') }
  },
  async repay(): Promise<{ txHash: Hash }> {
    await new Promise((r) => setTimeout(r, 800))
    return { txHash: mockTxHash('REPAY') }
  },
}

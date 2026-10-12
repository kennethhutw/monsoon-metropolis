// A-Pass (CVI) — Cleanverse identity module.
// docs.cleanverse.com API v5.6, "A-Pass Management" / "Common Queries".

import { postEncrypted, postPlain, CleanverseApiError } from './client'

export type CleanverseChain =
  | 'solana' | 'base' | 'avalanche' | 'arbitrum' | 'ethereum' | 'polygon' | 'bsc' | 'monad' | 'hashkey' | 'platon'

export interface IdentityDataInput {
  idType: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'HK_MACAO_TAIWAN_PASS' | 'RESIDENCE_PERMIT'
  fullName: string
  idNumber?: string
  validUntil?: string // yyyy-MM-dd
  issuingCountryISO2: string
}

export interface GenerateApassInput {
  customerId: string // >= 12 chars, [A-Za-z0-9] only
  wallet: { address: string; chain: CleanverseChain }
  expirationTime: number // unix seconds
  kycSource?: string
  kycId?: string
  subTier?: number
  subGroup?: string
  override?: boolean
  identityDataList?: IdentityDataInput[]
}

interface WalletResult {
  operate: string
  address: string
  chain: string
  txHash: string
  depositUSDCWallet?: string
  depositUSDTWallet?: string
}

interface GenerateApassResult {
  customerId: string
  cvRecordId: string
  tier: string
  wallet: WalletResult
}

/** Issues a new A-Pass (CVI) for a wallet. This is the real KYB → identity step. */
export async function generateApass(input: GenerateApassInput): Promise<GenerateApassResult> {
  return postEncrypted<GenerateApassResult>('/generate_apass', {
    customerId: input.customerId,
    kycSource: input.kycSource,
    kycId: input.kycId,
    subTier: input.subTier,
    subGroup: input.subGroup,
    override: input.override ?? false,
    expirationTime: input.expirationTime,
    wallet: input.wallet,
    identityDataList: input.identityDataList,
  })
}

/** status: 1 = activate (unfreeze), 2 = freeze. */
export async function updateApassStatus(input: {
  wallet: { address: string; chain: CleanverseChain }
  status: 1 | 2
  customerId?: string
  cvRecordId?: string
  blacklistReason?: string
}): Promise<{ txHash: string }> {
  return postEncrypted<{ txHash: string }>('/update_status', {
    customerId: input.customerId,
    cvRecordId: input.cvRecordId,
    status: String(input.status),
    blacklistReason: input.blacklistReason,
    wallet: input.wallet,
  })
}

export interface QueryApassResult {
  cvRecordId: string
  subTier: number
  tier: string
  status: 1 | 2
  expirationTime: number
  subGroup: string
  currentKycHash: string
  group: string
  countries: string[]
}

/** Plain JSON, not encrypted. Returns null if the wallet has no A-Pass record. */
export async function queryApass(chain: CleanverseChain, address: string): Promise<QueryApassResult | null> {
  try {
    return await postPlain<QueryApassResult>('/query_apass', { chain, address })
  } catch (err) {
    if (err instanceof CleanverseApiError && err.code === '0002') return null
    throw err
  }
}

export interface VerifyApassResult {
  chain: string
  atoken: string
  address: string
  code: 1 | 2 | 3 | 4 // 4 = success, has valid A-Pass and transfer allowed
  message: string
  magickLink?: string
}

/** Checks whether `address` is allowed to receive/transfer the given A-Token under compliance rules. */
export async function verifyApass(chain: CleanverseChain, atoken: string, address: string): Promise<VerifyApassResult> {
  return postPlain<VerifyApassResult>('/verify_apass', { chain, atoken, address })
}

// A-Token (CVA) — Cleanverse verified-asset module.
// docs.cleanverse.com API v5.6, "A-Token Management".
// Used once, at bootstrap time, to issue the token that replaces MockUSDC as
// FinancingPool's settlement currency — see scripts/launch-atoken.ts.

import { postEncrypted, getPlain } from './client'
import type { CleanverseChain } from './apass'

export interface AtokenComplianceRule {
  allowed_group?: string
  allowed_sub_group?: string
  min_tier: number
  min_sub_tier?: number
  is_black_list?: boolean
  countries?: string[]
}

export interface LaunchAtokenInput {
  chain: CleanverseChain
  token_name: string
  token_symbol: string
  decimals: number
  admin_address: string
  rule: AtokenComplianceRule
  icon: string
  callback_url?: string
}

interface LaunchAtokenResult {
  requestId: string
  issueAssetId: number
}

/** Submits an application to issue a new A-Token. Async — poll queryApplyStatus for the result. */
export async function launchAtoken(input: LaunchAtokenInput): Promise<LaunchAtokenResult> {
  return postEncrypted<LaunchAtokenResult>('/atoken/launch', input)
}

export interface ApplyStatusResult {
  flowType: 'LAUNCH' | 'LAUNCH_WRAPPED' | 'REGISTER_WRAPPED' | 'REGISTER_ATOKEN'
  requestId: string
  applyStatus: 'PENDING' | 'APPROVED' | 'ISSUED' | 'REJECTED' | 'ISSUE_FAILED'
  rejectReason?: string
  issueErrorMsg?: string
  chain: string
  atokenAddress?: string
  tokenSymbol?: string
  txHash?: string
  issuedAt?: string
}

export async function queryApplyStatus(requestId: string): Promise<ApplyStatusResult> {
  return getPlain<ApplyStatusResult>(`/atoken/query_apply_status/${requestId}`)
}

/** Polls until the application reaches a terminal state (ISSUED / REJECTED / ISSUE_FAILED). */
export async function waitForIssuance(
  requestId: string,
  { intervalMs = 5000, timeoutMs = 5 * 60 * 1000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<ApplyStatusResult> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const status = await queryApplyStatus(requestId)
    if (status.applyStatus === 'ISSUED' || status.applyStatus === 'REJECTED' || status.applyStatus === 'ISSUE_FAILED') {
      return status
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`Timed out waiting for A-Token application ${requestId} to reach a terminal state`)
}

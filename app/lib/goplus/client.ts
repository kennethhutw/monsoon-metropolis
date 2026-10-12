// ⚠️ server-only — 不可在任何 'use client' 元件 import 此檔案
// GoPlus Security API — Address Security (wallet risk screening).
// See docs/changes/20260807_GoPlus錢包風險篩查.md
import 'server-only'
import { createHash } from 'crypto'

const BASE_URL = 'https://api.gopluslabs.io/api/v1'

interface AccessTokenResult {
  access_token: string
  expires_in: number
}

// In-memory cache — a single server process reuses the token until shortly
// before it expires, instead of re-authenticating on every request.
let cachedToken: { token: string; expiresAt: number } | null = null

function sign(appKey: string, time: number, appSecret: string): string {
  return createHash('sha1').update(`${appKey}${time}${appSecret}`).digest('hex')
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  const appKey = process.env.GOPLUS_API_KEY
  const appSecret = process.env.GOPLUS_API_SECRET
  if (!appKey || !appSecret) {
    throw new Error('GOPLUS_API_KEY / GOPLUS_API_SECRET is not set')
  }

  const time = Math.floor(Date.now() / 1000)
  const res = await fetch(`${BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_key: appKey, time, sign: sign(appKey, time, appSecret) }),
  })
  if (!res.ok) throw new Error(`GoPlus token request failed (${res.status})`)

  const data = (await res.json()) as { code: number; message: string; result?: AccessTokenResult }
  if (data.code !== 1 || !data.result) throw new Error(`GoPlus token error: ${data.message}`)

  // Refresh 60s early so a request never races an about-to-expire token.
  cachedToken = { token: data.result.access_token, expiresAt: Date.now() + (data.result.expires_in - 60) * 1000 }
  return cachedToken.token
}

export interface AddressSecurityResult {
  phishing_activities?: string
  blacklist_doubt?: string
  blackmail_activities?: string
  cybercrime?: string
  darkweb_transactions?: string
  fake_kyc?: string
  fake_standard_interface?: string
  fake_token?: string
  financial_crime?: string
  gas_abuse?: string
  honeypot_related_address?: string
  malicious_mining_activities?: string
  mixer?: string
  money_laundering?: string
  sanctioned?: string
  stealing_attack?: string
  reinit?: string
  [key: string]: string | number | undefined
}

// Monad Testnet's chain_id isn't in GoPlus's documented supported list —
// callers must treat a thrown error here as "screening unavailable", not
// "wallet is risky". See docs/changes/20260807_GoPlus錢包風險篩查.md
export async function scanAddress(address: string, chainId: string): Promise<AddressSecurityResult> {
  // GoPlus's access_token value already includes the "Bearer " prefix —
  // do not prepend it again or the Authorization header ends up malformed
  // ("Bearer Bearer ...") and GoPlus rejects it as a signature failure.
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}/address_security/${address}?chain_id=${encodeURIComponent(chainId)}`, {
    headers: { Authorization: token },
  })
  if (!res.ok) throw new Error(`GoPlus address_security request failed (${res.status})`)

  const data = (await res.json()) as { code: number; message: string; result?: AddressSecurityResult }
  if (data.code !== 1 || !data.result) throw new Error(`GoPlus address_security error: ${data.message}`)
  return data.result
}

const RISK_FLAG_KEYS = [
  'phishing_activities', 'blacklist_doubt', 'blackmail_activities', 'cybercrime',
  'darkweb_transactions', 'fake_kyc', 'fake_standard_interface', 'fake_token',
  'financial_crime', 'gas_abuse', 'honeypot_related_address', 'malicious_mining_activities',
  'mixer', 'money_laundering', 'sanctioned', 'stealing_attack',
] as const

export function extractFlags(result: AddressSecurityResult): string[] {
  return RISK_FLAG_KEYS.filter((key) => result[key] === '1')
}

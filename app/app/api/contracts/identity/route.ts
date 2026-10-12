import { NextRequest, NextResponse } from 'next/server'
import type { Address } from 'viem'
import { contracts, RoleType, type RoleTypeValue } from '@/lib/contracts'
import { generateApass, type CleanverseChain, type IdentityDataInput } from '@/lib/cleanverse/apass'

// Issues a CVI credential. In real mode this is now a two-step process:
//   1. Cleanverse generate_apass — the real source of truth (KYB → A-Pass)
//   2. Mirror into our own ComplianceRegistry.registerCVI — our deployed
//      InvoiceAsset/FinancingPool contracts check OUR registry, and the
//      Cleanverse docs don't expose an on-chain verifier contract address we
//      could point Solidity at instead. See docs/changes/20260801_* for why.
// In mock mode, step 1 is skipped entirely — mockContracts.registerCVI()
// already simulates the whole thing with no network calls.
const ROLE_MAP: Record<string, RoleTypeValue> = {
  exporter: RoleType.EXPORTER,
  importer: RoleType.BUYER,
  buyer: RoleType.BUYER,
  bank: RoleType.BANK,
  admin: RoleType.ADMIN,
}

const isRealMode = process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'

function toCustomerId(wallet: string): string {
  // >= 12 chars, [A-Za-z0-9] only — derive deterministically from the wallet address.
  return `W${wallet.replace(/^0x/i, '').toUpperCase().slice(0, 30)}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, role, cviTokenId, fullName, issuingCountryISO2, customerId, expirationTime } = body
    if (!wallet || !role) {
      return NextResponse.json(
        { error: 'Missing required parameters', code: 'MISSING_PARAMS' },
        { status: 400 }
      )
    }
    const roleValue = ROLE_MAP[String(role).toLowerCase()]
    if (roleValue === undefined) {
      return NextResponse.json(
        { error: `Unknown role "${role}"`, code: 'INVALID_ROLE' },
        { status: 400 }
      )
    }

    let realCviRecordId: string | undefined

    if (isRealMode) {
      const identityDataList: IdentityDataInput[] | undefined = fullName
        ? [{ idType: 'ID_CARD', fullName, issuingCountryISO2: issuingCountryISO2 ?? 'SG' }]
        : undefined
      const apass = await generateApass({
        customerId: customerId ?? toCustomerId(wallet),
        wallet: { address: wallet, chain: 'monad' as CleanverseChain },
        expirationTime: expirationTime ?? Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
        identityDataList,
      })
      realCviRecordId = apass.cvRecordId
    }

    const result = await contracts.registerCVI(
      wallet as Address,
      roleValue,
      cviTokenId ?? realCviRecordId ?? `cvi-${Date.now()}`,
    )
    return NextResponse.json({ ...result, cleanverseCvRecordId: realCviRecordId })
  } catch (error) {
    console.error('[API] identity error:', error)
    const message = error instanceof Error ? error.message : 'Identity registration failed'
    return NextResponse.json({ error: message, code: 'IDENTITY_ERROR' }, { status: 500 })
  }
}

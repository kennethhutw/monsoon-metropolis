import { NextRequest, NextResponse } from 'next/server'
import { scanAddress, extractFlags } from '@/lib/goplus/client'

// AML wallet risk screening. Always responds 200 — success/failure is
// carried in the `checked` field so callers (and the bank Approve gate)
// can tell "technically unavailable" apart from "actually flagged".
// See docs/changes/20260807_GoPlus錢包風險篩查.md

const MONAD_TESTNET_CHAIN_ID = '10143'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  try {
    const result = await scanAddress(address, MONAD_TESTNET_CHAIN_ID)
    const flags = extractFlags(result)
    return NextResponse.json({ checked: true, flagged: flags.length > 0, flags })
  } catch (error) {
    console.error('[API] wallet-security error:', error)
    return NextResponse.json({ checked: false, flagged: false, flags: [], error: error instanceof Error ? error.message : 'Screening unavailable' })
  }
}

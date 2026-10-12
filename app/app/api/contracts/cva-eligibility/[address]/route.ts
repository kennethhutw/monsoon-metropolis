import { NextRequest, NextResponse } from 'next/server'
import { verifyApass } from '@/lib/cleanverse/apass'
import { contractAddresses } from '@/lib/contracts/config'

// Live check: is this wallet allowed to receive/transfer our A-Token (CVA)?
// See docs/changes/20260806_CVA資格檢查與申請.md

const isRealMode = process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params

    if (!isRealMode) {
      return NextResponse.json({ eligible: true, mock: true, code: 4, message: 'Mock mode — always eligible. This is not a real Cleanverse verification.' })
    }

    const result = await verifyApass('monad', contractAddresses.stablecoin, address)
    return NextResponse.json({ eligible: result.code === 4, mock: false, code: result.code, message: result.message })
  } catch (error) {
    console.error('[API] cva-eligibility error:', error)
    const message = error instanceof Error ? error.message : 'Eligibility check failed'
    return NextResponse.json({ error: message, code: 'CVA_ELIGIBILITY_ERROR' }, { status: 500 })
  }
}

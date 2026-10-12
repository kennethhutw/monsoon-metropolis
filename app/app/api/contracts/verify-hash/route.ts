import { NextRequest, NextResponse } from 'next/server'
import type { Hash } from 'viem'
import { contracts } from '@/lib/contracts'

// Anti-double-financing check against InvoiceAsset.isHashDuplicate.
// Hash registration itself only happens atomically inside mintInvoice — there
// is no standalone "register" call, so this endpoint is read-only.
export async function POST(request: NextRequest) {
  try {
    const { hash } = await request.json()
    if (!hash) {
      return NextResponse.json(
        { error: 'Missing hash parameter', code: 'MISSING_HASH' },
        { status: 400 }
      )
    }
    const exists = await contracts.isHashDuplicate(hash as Hash)
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('[API] verify-hash error:', error)
    const message = error instanceof Error ? error.message : 'Hash verification failed'
    return NextResponse.json({ error: message, code: 'VERIFY_HASH_ERROR' }, { status: 500 })
  }
}

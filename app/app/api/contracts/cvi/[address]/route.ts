import { NextRequest, NextResponse } from 'next/server'
import type { Address } from 'viem'
import { contracts } from '@/lib/contracts'
import { queryApass } from '@/lib/cleanverse/apass'

const isRealMode = process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  try {
    const { address } = await params
    const [isVerified, record, cleanverse] = await Promise.all([
      contracts.isVerified(address as Address),
      contracts.getCVIRecord(address as Address),
      isRealMode ? queryApass('monad', address) : Promise.resolve(null),
    ])
    return NextResponse.json({
      isVerified,
      record: {
        isActive: record.isActive,
        issuedAt: record.issuedAt.toString(),
        expiresAt: record.expiresAt.toString(),
        cviTokenId: record.cviTokenId,
        kybDataHash: record.kybDataHash,
        role: record.role,
      },
      // Real Cleanverse A-Pass record, when present — the actual source of
      // truth in real mode; `record` above is our own mirrored copy.
      cleanverse,
    })
  } catch (error) {
    console.error('[API] cvi lookup error:', error)
    const message = error instanceof Error ? error.message : 'CVI lookup failed'
    return NextResponse.json({ error: message, code: 'CVI_LOOKUP_ERROR' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { MOCK_CHAIN_RECORDS } from '@/data/mockChain'

export async function GET() {
  try {
    // TODO（合約）：CONTRACT_MODE=real 時，替換為 Sepolia 鏈上查詢：
    // const records = await fetchSepoliaTransactions()
    // return NextResponse.json(records)

    // 🔵 MOCK DATA：
    return NextResponse.json(MOCK_CHAIN_RECORDS)
  } catch (error) {
    console.error('[API] chain error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch on-chain records', code: 'CHAIN_FETCH_ERROR' },
      { status: 500 }
    )
  }
}

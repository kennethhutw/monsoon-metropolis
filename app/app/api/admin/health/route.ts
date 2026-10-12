import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { SystemHealth } from '@/types/admin'
import { getServerPublicClient, getRpcProvider } from '@/lib/contracts/serverRpc'

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const rpcProvider = getRpcProvider()
    let chainConnected = false
    try {
      await getServerPublicClient().getBlockNumber()
      chainConnected = true
    } catch (error) {
      console.error('[API] admin/health chain connectivity check failed:', error)
    }

    // Claude API status: presence check only, not a live ping (see docs/changes/20260905_Alchemy即時監控.md)
    const health: SystemHealth = {
      chainConnected,
      rpcProvider,
      claudeApiStatus: process.env.ANTHROPIC_API_KEY ? 'ok' : 'down',
      lastUpdated: new Date().toISOString(),
      errors24h: 0,
    }

    return NextResponse.json(health)
  } catch (error) {
    console.error('[API] admin/health error:', error)
    return NextResponse.json(
      { error: 'Health check failed', code: 'HEALTH_CHECK_ERROR' },
      { status: 500 }
    )
  }
}

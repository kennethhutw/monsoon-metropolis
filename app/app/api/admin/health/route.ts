import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { SystemHealth } from '@/types/admin'
import { getServerPublicClient, getRpcProvider } from '@/lib/contracts/serverRpc'
import { getCaseAi } from '@/lib/ai'

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

    // AI status: whether the provider behind the case assessment has a key configured, not a live ping
    const caseAi = getCaseAi()
    const health: SystemHealth = {
      chainConnected,
      rpcProvider,
      aiStatus: caseAi.available ? 'ok' : 'down',
      aiProvider: caseAi.providerLabel,
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

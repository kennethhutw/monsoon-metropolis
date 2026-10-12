import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DashboardStats } from '@/data/mockStats'

// Real aggregates computed from public.cases — replaces the previously
// hardcoded MOCK_DASHBOARD_STATS. See docs/changes/20260806_Admin控制台分層架構.md
// Shared by /bank/dashboard and /admin — both switch to real numbers together.

interface StatsRow {
  stage: string
  risk_level: string
  amount: number | string
  chain_tx_hash: string | null
  disbursed_at: string | null
  due_date: string | null
  repaid_at: string | null
  created_at: string
  updated_at: string
}

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: rows, error } = await supabase
      .from('cases')
      .select('stage, risk_level, amount, chain_tx_hash, disbursed_at, due_date, repaid_at, created_at, updated_at')
    if (error) throw error

    const cases = (rows ?? []) as StatsRow[]
    const total = cases.length

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const approvedAmountThisMonth = cases
      .filter((c) => c.stage === 'approved' && new Date(c.updated_at) >= monthStart)
      .reduce((sum, c) => sum + Number(c.amount), 0)

    const pendingCasesCount = cases.filter((c) => c.stage === 'submitted' || c.stage === 'ai_review' || c.stage === 'credit_committee').length

    const approvedDurations = cases
      .filter((c) => c.stage === 'approved')
      .map((c) => (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24))
    const avgProcessingDays = approvedDurations.length > 0
      ? Math.round((approvedDurations.reduce((a, b) => a + b, 0) / approvedDurations.length) * 10) / 10
      : 0

    const disbursed = cases.filter((c) => c.disbursed_at)
    const overdueCount = disbursed.filter((c) => !c.repaid_at && c.due_date && new Date(c.due_date) < new Date()).length
    const overdueRate = disbursed.length > 0 ? Math.round((overdueCount / disbursed.length) * 1000) / 10 : 0

    const chainDataCoverageRate = total > 0
      ? Math.round((cases.filter((c) => c.chain_tx_hash).length / total) * 1000) / 10
      : 0

    const stats: DashboardStats = {
      approvedAmountThisMonth,
      pendingCasesCount,
      avgProcessingDays,
      overdueRate,
      chainDataCoverageRate,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[API] stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics', code: 'STATS_FETCH_ERROR' },
      { status: 500 }
    )
  }
}

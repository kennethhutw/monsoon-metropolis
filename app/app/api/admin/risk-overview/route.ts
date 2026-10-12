import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

// High-risk cases cross-referenced with their latest adverse-media scan (if
// any) — for the Admin Dashboard's "Needs Attention" panel. Read-only: never
// triggers a new Exa/AI scan, just surfaces what's already been recorded.
// See docs/changes/20260806_Admin控制台分層架構.md

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const supabase = createAdminClient()
    const { data: cases, error } = await supabase
      .from('cases')
      .select('id, case_number, company_name, buyer_name, risk_score, stage')
      .eq('risk_level', 'high')
      .order('risk_score', { ascending: false })
    if (error) throw error

    const caseIds = (cases ?? []).map((c) => c.id)
    const scansByCase = new Map<string, { summary: string; searchedAt: string }>()

    if (caseIds.length > 0) {
      const { data: scans, error: scanError } = await supabase
        .from('case_news_scans')
        .select('case_id, summary, searched_at')
        .in('case_id', caseIds)
        .order('searched_at', { ascending: false })
      if (scanError) throw scanError

      for (const scan of scans ?? []) {
        if (!scansByCase.has(scan.case_id)) {
          scansByCase.set(scan.case_id, { summary: scan.summary, searchedAt: scan.searched_at })
        }
      }
    }

    const result = (cases ?? []).map((c) => ({
      caseNumber: c.case_number,
      companyName: c.company_name,
      buyerName: c.buyer_name,
      riskScore: Number(c.risk_score),
      stage: c.stage,
      latestScan: scansByCase.get(c.id) ?? null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] admin/risk-overview error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch risk overview', code: 'RISK_OVERVIEW_FETCH_ERROR' },
      { status: 500 }
    )
  }
}

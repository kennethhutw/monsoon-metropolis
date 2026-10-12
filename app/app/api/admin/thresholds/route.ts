import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/supabase/auditLog'
import { requireRole } from '@/lib/auth/requireRole'
import { GlobalThresholds } from '@/types/admin'

interface ThresholdsRow {
  buyer_concentration_limit: number
  overdue_rate_red_line: number
  single_borrower_limit: number
  travel_rule_threshold_usd: number
  updated_at: string
  updated_by: string | null
}

function toGlobalThresholds(row: ThresholdsRow): GlobalThresholds {
  return {
    buyerConcentrationLimit: Number(row.buyer_concentration_limit),
    overdueRateRedLine: Number(row.overdue_rate_red_line),
    singleBorrowerLimit: Number(row.single_borrower_limit),
    travelRuleThresholdUsd: Number(row.travel_rule_threshold_usd),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  }
}

export async function GET(request: NextRequest) {
  // Matches the table's own RLS intent: bank + admin can read, only admin can write.
  const auth = requireRole(request, ['admin', 'bank'])
  if (auth.error) return auth.error
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('thresholds')
      .select('buyer_concentration_limit, overdue_rate_red_line, single_borrower_limit, travel_rule_threshold_usd, updated_at, updated_by')
      .eq('id', 1)
      .single()
    if (error) throw error

    return NextResponse.json(toGlobalThresholds(data))
  } catch (error) {
    console.error('[API] admin/thresholds GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch thresholds', code: 'THRESHOLDS_FETCH_ERROR' },
      { status: 500 }
    )
  }
}

interface PutThresholdsBody {
  buyerConcentrationLimit?: number
  overdueRateRedLine?: number
  singleBorrowerLimit?: number
  travelRuleThresholdUsd?: number
  actorEmail?: string
}

export async function PUT(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const body = (await request.json()) as PutThresholdsBody
    const supabase = createAdminClient()

    const update: Record<string, unknown> = { updated_by: auth.session.email }
    if (body.buyerConcentrationLimit !== undefined) update.buyer_concentration_limit = body.buyerConcentrationLimit
    if (body.overdueRateRedLine !== undefined) update.overdue_rate_red_line = body.overdueRateRedLine
    if (body.singleBorrowerLimit !== undefined) update.single_borrower_limit = body.singleBorrowerLimit
    if (body.travelRuleThresholdUsd !== undefined) update.travel_rule_threshold_usd = body.travelRuleThresholdUsd

    const { data, error } = await supabase
      .from('thresholds')
      .update(update)
      .eq('id', 1)
      .select('buyer_concentration_limit, overdue_rate_red_line, single_borrower_limit, travel_rule_threshold_usd, updated_at, updated_by')
      .single()
    if (error) throw error

    await writeAuditLog(supabase, auth.session.email, 'UPDATE_THRESHOLDS', 'thresholds/1', 'Updated global threshold settings')

    return NextResponse.json(toGlobalThresholds(data))
  } catch (error) {
    console.error('[API] admin/thresholds PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update thresholds', code: 'THRESHOLDS_UPDATE_ERROR' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import type { Address } from 'viem'
import { createAdminClient } from '@/lib/supabase/admin'
import { contracts } from '@/lib/contracts'

// Travel Rule (FATF Recommendation 16) compliance record generator — NOT a
// real VASP-to-VASP transfer network. See docs/changes/20260807_TravelRule合規紀錄.md
// Threshold is Admin-configurable via /admin/thresholds — see
// docs/changes/20260808_TravelRule門檻可調整.md

const DEFAULT_TRAVEL_RULE_THRESHOLD_USD = 1000

async function getTravelRuleThreshold(supabase: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data, error } = await supabase.from('thresholds').select('travel_rule_threshold_usd').eq('id', 1).single()
  if (error || data == null) {
    console.error('[API] travel-rule: falling back to default threshold —', error)
    return DEFAULT_TRAVEL_RULE_THRESHOLD_USD
  }
  return Number(data.travel_rule_threshold_usd)
}

export async function GET(request: NextRequest) {
  try {
    const caseNumber = request.nextUrl.searchParams.get('caseNumber')
    if (!caseNumber) return NextResponse.json({ error: 'Missing caseNumber' }, { status: 400 })

    const supabase = createAdminClient()
    const { data: caseRow } = await supabase.from('cases').select('id').eq('case_number', caseNumber).maybeSingle()
    if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('travel_rule_records')
      .select('id, event_type, amount, applicable, customer_role, customer_wallet, customer_name, customer_cvi_verified, compliant, tx_hash, created_at')
      .eq('case_id', caseRow.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[API] travel-rule GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch travel rule records', code: 'TRAVEL_RULE_FETCH_ERROR' }, { status: 500 })
  }
}

interface CreateRecordBody {
  caseNumber: string
  eventType: 'disbursement' | 'repayment'
  amount: number
  txHash: string
  customerRole: 'exporter' | 'buyer'
  customerWallet: string
  customerName?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateRecordBody>
    const { caseNumber, eventType, amount, txHash, customerRole, customerWallet } = body
    if (!caseNumber || !eventType || amount == null || !txHash || !customerRole || !customerWallet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: caseRow } = await supabase.from('cases').select('id').eq('case_number', caseNumber).maybeSingle()
    if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const [customerCviVerified, threshold] = await Promise.all([
      contracts.isVerified(customerWallet as Address),
      getTravelRuleThreshold(supabase),
    ])
    const applicable = amount >= threshold
    const compliant = !applicable || customerCviVerified

    const { data, error } = await supabase
      .from('travel_rule_records')
      .insert({
        case_id: caseRow.id,
        event_type: eventType,
        amount,
        applicable,
        customer_role: customerRole,
        customer_wallet: customerWallet,
        customer_name: body.customerName ?? null,
        customer_cvi_verified: customerCviVerified,
        compliant,
        tx_hash: txHash,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] travel-rule POST error:', error)
    return NextResponse.json({ error: 'Failed to create travel rule record', code: 'TRAVEL_RULE_CREATE_ERROR' }, { status: 500 })
  }
}

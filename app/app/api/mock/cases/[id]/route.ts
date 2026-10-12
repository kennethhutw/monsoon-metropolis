import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapRowToCase, type CaseRow } from '@/lib/supabase/caseMapper'
import { CaseStage } from '@/types/case'

// :id is the human-readable case_number (e.g. "TBC-2024-089"), not the
// internal uuid — matches what existing pages/URLs already use.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('cases').select('*').eq('case_number', id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    return NextResponse.json(mapRowToCase(data as CaseRow))
  } catch (error) {
    console.error('[API] case GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch case', code: 'CASE_FETCH_ERROR' }, { status: 500 })
  }
}

interface PatchCaseBody {
  stage?: CaseStage
  // Written once the exporter's submitCase() tx confirms (real mode only).
  financingCaseId?: number
  chainTxHash?: string
  // Per-milestone activity timeline (real mode only) — each on-chain action
  // gets its own column so later actions don't overwrite earlier tx hashes.
  buyerConfirmedAt?: string
  buyerConfirmedTxHash?: string
  submittedTxHash?: string
  submittedAt?: string
  approvedTxHash?: string
  approvedAt?: string
  rejectedTxHash?: string
  rejectedAt?: string
  disbursedTxHash?: string
  disbursedAt?: string
  repaidTxHash?: string
  repaidAt?: string
  buyerName?: string
  invoiceNumber?: string
  dueDate?: string
  industry?: string
  buyerCountry?: string
  exporterCountry?: string
}

const VALID_STAGES: CaseStage[] = ['submitted', 'ai_review', 'credit_committee', 'approved', 'rejected']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = (await request.json()) as PatchCaseBody

    const update: Record<string, unknown> = {}
    if (body.stage !== undefined) {
      if (!VALID_STAGES.includes(body.stage)) {
        return NextResponse.json({ error: 'Invalid review stage' }, { status: 400 })
      }
      update.stage = body.stage
    }
    if (body.financingCaseId !== undefined) update.financing_case_id = body.financingCaseId
    if (body.chainTxHash !== undefined) update.chain_tx_hash = body.chainTxHash
    if (body.buyerConfirmedAt !== undefined) update.buyer_confirmed_at = body.buyerConfirmedAt
    if (body.buyerConfirmedTxHash !== undefined) update.buyer_confirmed_tx_hash = body.buyerConfirmedTxHash
    if (body.submittedTxHash !== undefined) update.submitted_tx_hash = body.submittedTxHash
    if (body.submittedAt !== undefined) update.submitted_at = body.submittedAt
    if (body.approvedTxHash !== undefined) update.approved_tx_hash = body.approvedTxHash
    if (body.approvedAt !== undefined) update.approved_at = body.approvedAt
    if (body.rejectedTxHash !== undefined) update.rejected_tx_hash = body.rejectedTxHash
    if (body.rejectedAt !== undefined) update.rejected_at = body.rejectedAt
    if (body.disbursedTxHash !== undefined) update.disbursed_tx_hash = body.disbursedTxHash
    if (body.disbursedAt !== undefined) update.disbursed_at = body.disbursedAt
    if (body.repaidTxHash !== undefined) update.repaid_tx_hash = body.repaidTxHash
    if (body.repaidAt !== undefined) update.repaid_at = body.repaidAt
    if (body.buyerName !== undefined) update.buyer_name = body.buyerName
    if (body.invoiceNumber !== undefined) update.invoice_number = body.invoiceNumber
    if (body.dueDate !== undefined) update.due_date = body.dueDate
    if (body.industry !== undefined) update.industry = body.industry
    if (body.buyerCountry !== undefined) update.buyer_country = body.buyerCountry
    if (body.exporterCountry !== undefined) update.exporter_country = body.exporterCountry
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('cases')
      .update(update)
      .eq('case_number', id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    return NextResponse.json(mapRowToCase(data as CaseRow))
  } catch {
    return NextResponse.json({ error: 'Failed to update case status', code: 'CASE_UPDATE_ERROR' }, { status: 500 })
  }
}

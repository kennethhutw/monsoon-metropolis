import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types/user'

// Exporter/importer self-service CVI applications. Submitting one does NOT
// call Cleanverse — it only queues a pending row for admin review.
// See docs/changes/20260806_CVA資格檢查與申請.md

// GET ?wallet=0x... — current application state for a wallet (used by
// exporter/kyb and importer/kyb to decide which button/state to show).
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet')
    if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('cvi_applications')
      .select('id, wallet_address, role, status, requested_at, reviewed_at, rejection_reason, cv_record_id, chain_tx_hash')
      .ilike('wallet_address', wallet)
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error

    return NextResponse.json({ application: data })
  } catch (error) {
    console.error('[API] cvi-applications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch application status', code: 'CVI_APPLICATION_FETCH_ERROR' }, { status: 500 })
  }
}

interface CreateApplicationBody {
  wallet: string
  role: UserRole
  applicantEmail?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateApplicationBody>
    const { wallet, role } = body
    if (!wallet || !role) {
      return NextResponse.json({ error: 'Missing wallet or role' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Don't stack duplicate pending applications for the same wallet.
    const { data: existingPending, error: existingError } = await supabase
      .from('cvi_applications')
      .select('id, wallet_address, role, status, requested_at, reviewed_at, rejection_reason, cv_record_id, chain_tx_hash')
      .ilike('wallet_address', wallet)
      .eq('status', 'pending')
      .maybeSingle()
    if (existingError) throw existingError
    if (existingPending) return NextResponse.json({ application: existingPending })

    const { data, error } = await supabase
      .from('cvi_applications')
      .insert({ wallet_address: wallet, role, applicant_email: body.applicantEmail })
      .select('id, wallet_address, role, status, requested_at, reviewed_at, rejection_reason, cv_record_id, chain_tx_hash')
      .single()
    if (error) throw error

    return NextResponse.json({ application: data })
  } catch (error) {
    console.error('[API] cvi-applications POST error:', error)
    return NextResponse.json({ error: 'Failed to submit application', code: 'CVI_APPLICATION_CREATE_ERROR' }, { status: 500 })
  }
}

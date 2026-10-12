import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

// See docs/changes/20260806_CVA資格檢查與申請.md

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('cvi_applications')
      .select('id, wallet_address, role, applicant_email, status, requested_at, reviewed_at, reviewed_by, rejection_reason, cv_record_id, chain_tx_hash')
      .order('requested_at', { ascending: false })
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('[API] admin/cvi-applications GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch applications', code: 'CVI_APPLICATIONS_FETCH_ERROR' }, { status: 500 })
  }
}

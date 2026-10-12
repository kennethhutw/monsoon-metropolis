import { NextRequest, NextResponse } from 'next/server'
import type { Address } from 'viem'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/supabase/auditLog'
import { requireRole } from '@/lib/auth/requireRole'
import { contracts, RoleType, type RoleTypeValue } from '@/lib/contracts'
import { generateApass, type CleanverseChain } from '@/lib/cleanverse/apass'

// Approving is the ONLY place that actually calls Cleanverse generate_apass
// + ComplianceRegistry.registerCVI for a self-service application — the
// POST that created the row never does. See docs/changes/20260806_CVA資格檢查與申請.md

const ROLE_MAP: Record<string, RoleTypeValue> = {
  exporter: RoleType.EXPORTER,
  importer: RoleType.BUYER,
  buyer: RoleType.BUYER,
  bank: RoleType.BANK,
  admin: RoleType.ADMIN,
}

const isRealMode = process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'

function toCustomerId(wallet: string): string {
  return `W${wallet.replace(/^0x/i, '').toUpperCase().slice(0, 30)}`
}

interface PatchBody {
  action: 'approve' | 'reject'
  reason?: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  const actorEmail = auth.session.email // server-verified, not the client-supplied body field
  const supabase = createAdminClient()
  try {
    const { id } = await params
    const body = (await request.json()) as Partial<PatchBody>
    if (body.action !== 'approve' && body.action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
    }

    const { data: application, error: fetchError } = await supabase
      .from('cvi_applications')
      .select('id, wallet_address, role, status')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (application.status !== 'pending') {
      return NextResponse.json({ error: `Application already ${application.status}` }, { status: 409 })
    }

    if (body.action === 'reject') {
      const { data, error } = await supabase
        .from('cvi_applications')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: actorEmail, rejection_reason: body.reason ?? null })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      await writeAuditLog(supabase, actorEmail, 'REJECT_CVI_APPLICATION', `cvi_applications/${id}`, `Rejected ${application.wallet_address} (${application.role})`)
      return NextResponse.json(data)
    }

    // approve — this is the real Cleanverse + on-chain call
    const roleValue = ROLE_MAP[String(application.role).toLowerCase()]
    if (roleValue === undefined) {
      return NextResponse.json({ error: `Unknown role "${application.role}"` }, { status: 400 })
    }

    let realCviRecordId: string | undefined
    if (isRealMode) {
      const apass = await generateApass({
        customerId: toCustomerId(application.wallet_address),
        wallet: { address: application.wallet_address, chain: 'monad' as CleanverseChain },
        expirationTime: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      })
      realCviRecordId = apass.cvRecordId
    }

    const result = await contracts.registerCVI(
      application.wallet_address as Address,
      roleValue,
      realCviRecordId ?? `cvi-${Date.now()}`,
    )

    const { data, error } = await supabase
      .from('cvi_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: actorEmail,
        cv_record_id: realCviRecordId ?? null,
        chain_tx_hash: result.txHash,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    await writeAuditLog(supabase, actorEmail, 'APPROVE_CVI_APPLICATION', `cvi_applications/${id}`, `Approved ${application.wallet_address} (${application.role}) — ${result.txHash}`)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] admin/cvi-applications/[id] PATCH error:', error)
    const message = error instanceof Error ? error.message : 'Failed to review application'
    return NextResponse.json({ error: message, code: 'CVI_APPLICATION_REVIEW_ERROR' }, { status: 500 })
  }
}

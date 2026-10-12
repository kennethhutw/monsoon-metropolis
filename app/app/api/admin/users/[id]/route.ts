import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/supabase/auditLog'
import { requireRole } from '@/lib/auth/requireRole'
import type { AdminUserRow, UserRole } from '@/types/user'

// See docs/changes/20260806_使用者管理真實化.md、20260806_Admin控制台分層架構.md

interface RelatedCase {
  caseNumber: string
  companyName: string
  buyerName: string | null
  stage: string
  amount: number
  chainTxHash: string | null
  updatedAt: string
  roleInCase: 'exporter' | 'buyer'
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, name, organization, wallet_address, is_seed, created_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let relatedCases: RelatedCase[] = []
    // Bank/admin/researcher share a single on-chain bankWallet — cases can't
    // be attributed to one individual, so we don't fake a case list for them.
    if (user.wallet_address && (user.role === 'exporter' || user.role === 'importer')) {
      const walletColumn = user.role === 'exporter' ? 'exporter_wallet' : 'buyer_wallet'
      const roleInCase = user.role === 'exporter' ? 'exporter' : 'buyer'
      const { data: caseRows, error: casesError } = await supabase
        .from('cases')
        .select('case_number, company_name, buyer_name, stage, amount, chain_tx_hash, updated_at')
        .ilike(walletColumn, user.wallet_address)
        .order('updated_at', { ascending: false })
      if (casesError) throw casesError
      relatedCases = (caseRows ?? []).map((c) => ({
        caseNumber: c.case_number,
        companyName: c.company_name,
        buyerName: c.buyer_name,
        stage: c.stage,
        amount: Number(c.amount),
        chainTxHash: c.chain_tx_hash,
        updatedAt: c.updated_at,
        roleInCase: roleInCase as 'exporter' | 'buyer',
      }))
    }

    const nftCount = relatedCases.filter((c) => c.roleInCase === 'exporter' && c.chainTxHash).length

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organization: user.organization,
      walletAddress: user.wallet_address,
      isSeed: user.is_seed,
      createdAt: user.created_at,
      nftCount,
      relatedCases,
    })
  } catch (error) {
    console.error('[API] admin/users/[id] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch user', code: 'USER_FETCH_ERROR' }, { status: 500 })
  }
}

interface PatchUserBody {
  name?: string
  organization?: string
  role?: UserRole
  walletAddress?: string | null
  password?: string
  actorEmail?: string
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  const actorEmail = auth.session.email
  try {
    const { id } = await params
    const body = (await request.json()) as PatchUserBody
    const supabase = createAdminClient()

    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, email, is_seed')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (body.password !== undefined) {
      if (existing.is_seed) {
        return NextResponse.json(
          { error: 'Demo account passwords cannot be reset from this panel', code: 'SEED_USER_PASSWORD_LOCKED' },
          { status: 403 }
        )
      }
      if (!body.password) {
        return NextResponse.json({ error: 'Password cannot be empty' }, { status: 400 })
      }
    }

    const update: Record<string, unknown> = {}
    if (body.name !== undefined) update.name = body.name
    if (body.organization !== undefined) update.organization = body.organization
    if (body.role !== undefined) update.role = body.role
    if (body.walletAddress !== undefined) update.wallet_address = body.walletAddress || null
    if (body.password !== undefined) update.password = body.password

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', id)
      .select('id, email, role, name, organization, wallet_address, is_seed, created_at')
      .single()
    if (error) throw error

    const action = body.password !== undefined ? 'RESET_USER_PASSWORD' : 'UPDATE_USER'
    const changedFields = Object.keys(update).filter((k) => k !== 'password').join(', ')
    const detail = body.password !== undefined
      ? `Reset password for ${existing.email}`
      : `Updated ${existing.email}${changedFields ? `: ${changedFields}` : ''}`
    await writeAuditLog(supabase, actorEmail, action, `users/${id}`, detail)

    const result: AdminUserRow = {
      id: data.id,
      email: data.email,
      role: data.role,
      name: data.name,
      organization: data.organization,
      walletAddress: data.wallet_address,
      isSeed: data.is_seed,
      nftCount: 0, // caller already has the count from the list view; not recomputed here
      createdAt: data.created_at,
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] admin/users PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update user', code: 'USER_UPDATE_ERROR' }, { status: 500 })
  }
}

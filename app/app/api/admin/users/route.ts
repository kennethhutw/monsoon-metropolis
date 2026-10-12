import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/supabase/auditLog'
import { requireRole } from '@/lib/auth/requireRole'
import type { AdminUserRow, UserRole } from '@/types/user'

// See docs/changes/20260806_使用者管理真實化.md

interface UserRow {
  id: string
  email: string
  role: UserRole
  name: string
  organization: string
  wallet_address: string | null
  is_seed: boolean
  created_at: string
}

function mapRow(row: UserRow, nftCount: number): AdminUserRow {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    name: row.name,
    organization: row.organization,
    walletAddress: row.wallet_address,
    isSeed: row.is_seed,
    nftCount,
    createdAt: row.created_at,
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const supabase = createAdminClient()
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, name, organization, wallet_address, is_seed, created_at')
      .order('created_at', { ascending: true })
    if (error) throw error

    // NFT count = mint-successful cases (chain_tx_hash set) whose exporter
    // wallet matches this user's registered wallet_address — not a live
    // on-chain balanceOf call, per docs/changes decision.
    const { data: mintedCases, error: casesError } = await supabase
      .from('cases')
      .select('exporter_wallet')
      .not('chain_tx_hash', 'is', null)
      .not('exporter_wallet', 'is', null)
    if (casesError) throw casesError

    const countByWallet = new Map<string, number>()
    for (const row of mintedCases ?? []) {
      const wallet = row.exporter_wallet?.toLowerCase()
      if (!wallet) continue
      countByWallet.set(wallet, (countByWallet.get(wallet) ?? 0) + 1)
    }

    const result = (users as UserRow[] ?? []).map((u) =>
      mapRow(u, u.wallet_address ? (countByWallet.get(u.wallet_address.toLowerCase()) ?? 0) : 0)
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] admin/users GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch users', code: 'USERS_FETCH_ERROR' }, { status: 500 })
  }
}

interface CreateUserBody {
  email: string
  password: string
  role: UserRole
  name: string
  organization: string
  walletAddress?: string
  actorEmail?: string
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const body = (await request.json()) as Partial<CreateUserBody>
    const { email, password, role, name, organization } = body
    if (!email || !password || !role || !name || !organization) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, role, name, organization', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password,
        role,
        name,
        organization,
        wallet_address: body.walletAddress || null,
        is_seed: false,
      })
      .select('id, email, role, name, organization, wallet_address, is_seed, created_at')
      .single()
    if (error) throw error

    await writeAuditLog(supabase, auth.session.email, 'CREATE_USER', `users/${data.id}`, `Created ${email} (${role})`)

    return NextResponse.json(mapRow(data as UserRow, 0))
  } catch (error) {
    console.error('[API] admin/users POST error:', error)
    const message = error instanceof Error && error.message.includes('duplicate key') ? 'A user with this email already exists' : 'Failed to create user'
    return NextResponse.json({ error: message, code: 'USER_CREATE_ERROR' }, { status: 500 })
  }
}

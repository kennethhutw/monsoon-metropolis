'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD, formatDate } from '@/lib/utils'
import { explorerAddressUrl } from '@/lib/contracts/config'
import { AdminUserRow, UserRole } from '@/types/user'
import { ROLE_LABEL, EditUserDialog, ResetPasswordDialog } from '@/app/admin/users/page'
import { ArrowLeft, Coins, Lock, Link2, FolderOpen } from 'lucide-react'

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

interface UserDetail extends AdminUserRow {
  relatedCases: RelatedCase[]
}

const STAGE_LABEL: Record<string, string> = {
  submitted: 'Submitted', ai_review: 'AI Review',
  credit_committee: 'Credit Committee', approved: 'Approved', rejected: 'Rejected',
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [notFound, setNotFound] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(data => { if (data.error) setNotFound(true); else setUser(data) })
      .catch(() => setNotFound(true))
  }, [id])

  useEffect(() => { load() }, [load])

  if (notFound) return (
    <PageLayout title="User"><p className="text-body-md text-ink-faint">User {id} not found</p></PageLayout>
  )
  if (!user) return (
    <PageLayout title="User"><div className="space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div></PageLayout>
  )

  const roleIsCaseBound = user.role === 'exporter' || user.role === 'importer'

  return (
    <PageLayout
      title={user.name}
      subtitle={user.email}
      actions={<a href="/admin/users" className="text-body-md text-primary hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Back to Users</a>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 space-y-4">
            <div>
              <label className="text-label-md uppercase text-outline block mb-1 font-mono">Role</label>
              <span className="text-label-md px-2 py-0.5 rounded-full bg-primary-fixed/40 text-primary font-mono">{ROLE_LABEL[user.role as UserRole]}</span>
            </div>
            <div>
              <label className="text-label-md uppercase text-outline block mb-1 font-mono">Organization</label>
              <p className="text-body-md text-ink">{user.organization}</p>
            </div>
            <div>
              <label className="text-label-md uppercase text-outline block mb-1 font-mono">Wallet Address</label>
              {user.walletAddress ? (
                <a href={explorerAddressUrl(user.walletAddress)} target="_blank" rel="noopener noreferrer" className="text-code-sm text-primary hover:underline font-mono break-all flex items-center gap-1.5">
                  <Link2 size={13} className="shrink-0" /> {user.walletAddress}
                </a>
              ) : <p className="text-body-md text-ink-faint">Not set</p>}
            </div>
            <div>
              <label className="text-label-md uppercase text-outline block mb-1 font-mono">Invoice NFTs Minted</label>
              <p className="text-body-md text-ink flex items-center gap-1.5"><Coins size={14} className="text-primary" /> {user.nftCount}</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <EditUserDialog user={user} onSaved={() => load()} />
              {user.isSeed ? (
                <span className="inline-flex items-center gap-1 text-label-md text-ink-faint px-2" title="Demo account — password can't be reset from this panel">
                  <Lock size={13} /> Demo account
                </span>
              ) : (
                <ResetPasswordDialog user={user} />
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border-subtle">
              <FolderOpen size={18} className="text-primary" />
              <h2 className="text-title-lg font-bold">
                {user.role === 'exporter' ? 'Cases Submitted' : user.role === 'importer' ? 'Cases as Buyer' : 'Related Cases'}
              </h2>
            </div>
            {!roleIsCaseBound ? (
              <p className="text-body-md text-on-surface-variant p-6">
                {ROLE_LABEL[user.role as UserRole]} actions go through a single shared on-chain wallet, so individual case activity can&apos;t be attributed to this specific user.
              </p>
            ) : user.relatedCases.length === 0 ? (
              <p className="text-body-md text-on-surface-variant p-6">
                {user.walletAddress ? 'No cases linked to this wallet yet.' : 'No wallet address set — add one to link this user to their on-chain cases.'}
              </p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {user.relatedCases.map(c => (
                  <a key={c.caseNumber} href={`/bank/cases/${c.caseNumber}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-container-low transition-colors">
                    <div className="min-w-0">
                      <p className="text-body-md font-semibold text-ink truncate">{c.roleInCase === 'exporter' ? c.buyerName ?? 'Unknown buyer' : c.companyName}</p>
                      <p className="text-label-md text-ink-faint font-mono">{c.caseNumber} · {formatDate(c.updatedAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-body-md font-semibold text-ink font-mono">{formatUSD(c.amount)}</p>
                      <span className="text-label-md text-on-surface-variant">{STAGE_LABEL[c.stage] ?? c.stage}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

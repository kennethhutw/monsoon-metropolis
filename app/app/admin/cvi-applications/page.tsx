'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { useRole } from '@/hooks/useRole'
import { explorerTxUrl } from '@/lib/contracts/config'
import { Check, X, ExternalLink } from 'lucide-react'

interface CviApplication {
  id: string
  wallet_address: string
  role: string
  applicant_email: string | null
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
  cv_record_id: string | null
  chain_tx_hash: string | null
}

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-risk-medium/15 text-risk-medium',
  approved: 'bg-risk-low/15 text-risk-low',
  rejected: 'bg-risk-high/15 text-risk-high',
}

function RejectDialog({ app, onReviewed }: { app: CviApplication; onReviewed: (a: CviApplication) => void }) {
  const { user: actor } = useRole()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReject = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/cvi-applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason, actorEmail: actor?.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onReviewed(data)
      toast.error('Application rejected', { description: app.wallet_address })
      setOpen(false)
    } catch (error) {
      toast.error('Failed to reject', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <X size={14} className="mr-1" /> Reject
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject CVI application</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <label className="text-label-md text-on-surface-variant font-mono">Reason (optional)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Missing KYB documentation" />
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={handleReject} disabled={saving}>{saving ? 'Rejecting…' : 'Confirm Rejection'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminCviApplicationsPage() {
  const { user: actor } = useRole()
  const [applications, setApplications] = useState<CviApplication[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch('/api/admin/cvi-applications')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok || !Array.isArray(data)) throw new Error(data?.error ?? 'Failed to load applications')
        setApplications(data)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load applications'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleApprove = async (app: CviApplication) => {
    setApprovingId(app.id)
    try {
      const res = await fetch(`/api/admin/cvi-applications/${app.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', actorEmail: actor?.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setApplications((prev) => prev?.map((a) => (a.id === app.id ? data : a)) ?? prev)
      toast.success('CVI issued', { description: `${app.wallet_address} — ${app.role}` })
    } catch (error) {
      toast.error('Approval failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setApprovingId(null)
    }
  }

  const pending = applications?.filter((a) => a.status === 'pending') ?? []
  const reviewed = applications?.filter((a) => a.status !== 'pending') ?? []

  return (
    <PageLayout title="CVI Applications" subtitle="Review self-service CVI/A-Pass requests before Cleanverse issuance">
      <div className="space-y-6">
        <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle">
            <h2 className="text-title-lg font-bold">Pending Review ({pending.length})</h2>
          </div>
          <DataWrapper data={applications} loading={loading} error={error}
            empty={<EmptyState title="No applications yet" />}
            skeleton={<div className="p-6 space-y-2">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>}
          >
            {() => pending.length === 0 ? (
              <p className="p-6 text-body-md text-ink-faint">Nothing waiting for review.</p>
            ) : (
              <div className="divide-y divide-border-subtle">
                {pending.map((app) => (
                  <div key={app.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-body-md font-mono font-semibold text-ink truncate">{app.wallet_address}</p>
                      <p className="text-label-md text-ink-faint">{app.role} · requested {new Date(app.requested_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleApprove(app)} disabled={approvingId === app.id}>
                        <Check size={14} className="mr-1" /> {approvingId === app.id ? 'Approving…' : 'Approve'}
                      </Button>
                      <RejectDialog app={app} onReviewed={(updated) => setApplications((prev) => prev?.map((a) => (a.id === updated.id ? updated : a)) ?? prev)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataWrapper>
        </div>

        {reviewed.length > 0 && (
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-title-lg font-bold">Reviewed</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead className="bg-surface-container-low border-b border-border-subtle">
                  <tr>{['Wallet', 'Role', 'Status', 'Reviewed', 'Tx'].map((h) => <th key={h} className="text-left px-5 py-3 text-label-md font-medium text-ink-faint uppercase font-mono">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {reviewed.map((app) => (
                    <tr key={app.id}>
                      <td className="px-5 py-3.5 font-mono text-label-md text-ink truncate max-w-[220px]">{app.wallet_address}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant">{app.role}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-label-md px-2 py-0.5 rounded-full font-mono ${STATUS_TONE[app.status]}`}>{app.status}</span>
                        {app.status === 'rejected' && app.rejection_reason && <span className="block text-label-md text-ink-faint mt-0.5">{app.rejection_reason}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-label-md text-ink-faint">{app.reviewed_at ? new Date(app.reviewed_at).toLocaleString() : '—'}</td>
                      <td className="px-5 py-3.5">
                        {app.chain_tx_hash ? (
                          <a href={explorerTxUrl(app.chain_tx_hash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-label-md">
                            View <ExternalLink size={12} />
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

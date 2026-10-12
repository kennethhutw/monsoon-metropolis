'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Coins, CheckCircle2, AlertTriangle, Clock, FlaskConical } from 'lucide-react'

// Live A-Token (CVA) transfer/receive eligibility check + self-service CVI
// application (admin review required before it's actually granted).
// See docs/changes/20260806_CVA資格檢查與申請.md

interface Eligibility {
  eligible: boolean
  mock: boolean
  message: string
}

interface CviApplication {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  requested_at: string
}

export function CvaEligibilityCard({ address, role }: { address: string; role: 'exporter' | 'importer' }) {
  const [eligibility, setEligibility] = useState<Eligibility | null>(null)
  const [application, setApplication] = useState<CviApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/contracts/cva-eligibility/${address}`).then((r) => r.json()),
      fetch(`/api/cvi-applications?wallet=${address}`).then((r) => r.json()),
    ])
      .then(([elig, app]) => {
        setEligibility(elig)
        setApplication(app.application ?? null)
      })
      .catch((error) => console.error('[CvaEligibilityCard] load failed:', error))
      .finally(() => setLoading(false))
  }, [address])

  useEffect(() => { load() }, [load])

  const handleApply = async () => {
    setApplying(true)
    try {
      const res = await fetch('/api/cvi-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit application')
      setApplication(data.application)
      toast.success('CVI application submitted', { description: 'An admin will review it before verification is granted.' })
    } catch (error) {
      toast.error('Failed to submit application', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
        <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Coins size={18} className="text-primary" />
        <h3 className="text-title-lg font-bold">A-Token Settlement Eligibility (CVA)</h3>
      </div>

      {eligibility?.mock ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-risk-medium/10 text-risk-medium">
          <FlaskConical size={16} className="shrink-0" />
          <span className="text-body-md">Demo Mode — this is not a real Cleanverse verification. Real-mode configuration is missing.</span>
        </div>
      ) : (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${eligibility?.eligible ? 'bg-risk-low/10 text-risk-low' : 'bg-risk-medium/10 text-risk-medium'}`}>
          {eligibility?.eligible ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertTriangle size={16} className="shrink-0" />}
          <span className="text-body-md">
            {eligibility?.eligible ? 'Eligible to receive/transfer CVA settlement funds' : (eligibility?.message || 'Not eligible')}
          </span>
        </div>
      )}

      {!eligibility?.eligible && (
        <div className="mt-4">
          {!application && (
            <Button onClick={handleApply} disabled={applying} size="sm">
              {applying ? 'Submitting…' : 'Apply for CVI Verification'}
            </Button>
          )}
          {application?.status === 'pending' && (
            <p className="flex items-center gap-1.5 text-body-md text-on-surface-variant">
              <Clock size={14} className="shrink-0" /> Application under review since {new Date(application.requested_at).toLocaleString()}
            </p>
          )}
          {application?.status === 'rejected' && (
            <div className="space-y-2">
              <p className="text-body-md text-error">Rejected{application.rejection_reason ? `: ${application.rejection_reason}` : ''}</p>
              <Button onClick={handleApply} disabled={applying} size="sm">
                {applying ? 'Submitting…' : 'Re-apply'}
              </Button>
            </div>
          )}
          {application?.status === 'approved' && (
            <p className="text-body-md text-on-surface-variant">Approved — refresh the page if this still shows as not eligible.</p>
          )}
        </div>
      )}
    </div>
  )
}

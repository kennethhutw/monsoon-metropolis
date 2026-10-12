'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatUSD, formatDate } from '@/lib/utils'
import { FinanceCase } from '@/types/case'

const TOTAL_LIMIT = 150_000_000   // $150M mock approved total limit

export default function ImporterLimitsPage() {
  const [cases, setCases] = useState<FinanceCase[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    fetch('/api/mock/cases?stage=approved')
      .then(r => r.json())
      .then(setCases)
      .finally(() => setLoading(false))
  }, [])

  const usedAmount = cases?.reduce((s, c) => s + c.amount, 0) ?? 0
  const remaining = TOTAL_LIMIT - usedAmount
  const usedPct = Math.min(100, Math.round((usedAmount / TOTAL_LIMIT) * 100))

  const handleRequest = async () => {
    setRequesting(true)
    // TODO（Supabase）: INSERT INTO limit_requests ...
    await new Promise(r => setTimeout(r, 800))
    setRequesting(false)
    toast.success('Credit limit increase request submitted', {
      description: 'The bank will review your request within 3 business days',
    })
  }

  return (
    <PageLayout
      title="Credit Limits"
      subtitle="Financing limit utilization"
      actions={
        <AlertDialog>
          <AlertDialogTrigger
            className="text-body-md px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all font-semibold"
          >
            Request Limit Increase
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Request a Higher Financing Limit</AlertDialogTitle>
              <AlertDialogDescription>
                Your current approved total limit is <strong>{formatUSD(TOTAL_LIMIT)}</strong>, {usedPct}% used. Submitting this request will trigger a re-assessment of your creditworthiness by the bank.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-primary hover:opacity-90"
                onClick={handleRequest}
                disabled={requesting}
              >
                Confirm & Submit Request
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      <div className="max-w-lg space-y-6">
        {/* Overview card */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
          <h2 className="text-title-lg font-bold text-on-surface mb-5">Limit Overview</h2>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center">
              <p className="text-label-md text-ink-faint mb-1 font-mono uppercase">Approved Total</p>
              <p className="text-body-md font-bold text-primary font-mono">{formatUSD(TOTAL_LIMIT)}</p>
            </div>
            <div className="text-center">
              <p className="text-label-md text-ink-faint mb-1 font-mono uppercase">Used</p>
              <p className="text-body-md font-bold text-ink font-mono">
                {loading ? '—' : formatUSD(usedAmount)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-label-md text-ink-faint mb-1 font-mono uppercase">Remaining</p>
              <p className={`text-body-md font-bold font-mono ${remaining < TOTAL_LIMIT * 0.2 ? 'text-error' : 'text-risk-low'}`}>
                {loading ? '—' : formatUSD(remaining)}
              </p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-label-md text-ink-faint mb-1">
              <span>Limit Utilization</span>
              <span className="font-mono">{loading ? '—' : `${usedPct}%`}</span>
            </div>
            <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden">
              {!loading && (
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${usedPct}%`,
                    background: usedPct > 80 ? 'var(--risk-high)' : usedPct > 60 ? 'var(--risk-medium)' : 'var(--primary-container)',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Case breakdown */}
        <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
          <h2 className="text-title-lg font-bold text-on-surface mb-5">Used Limit Breakdown</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : cases && cases.length > 0 ? (
            <div className="space-y-3">
              {cases.map(c => {
                const pct = Math.round((c.amount / TOTAL_LIMIT) * 100)
                return (
                  <div key={c.id} className="p-4 bg-surface-container-low rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-body-md font-semibold text-ink">{c.companyName}</p>
                        <p className="text-label-md text-ink-faint font-mono">{c.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-body-md font-bold text-ink font-mono">{formatUSD(c.amount)}</p>
                        <p className="text-label-md text-ink-faint">Due {formatDate(c.updatedAt)}</p>
                      </div>
                    </div>
                    <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary-container" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-label-md text-ink-faint mt-1">{pct}% of total limit</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-body-md text-ink-faint py-2">No approved cases at this time</p>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

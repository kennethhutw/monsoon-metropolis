'use client'
import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { SystemHealth } from '@/types/admin'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

export default function AdminHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const refresh = () => { setLoading(true); fetch('/api/admin/health').then(r => r.json()).then(setHealth).finally(() => setLoading(false)) }
  useEffect(() => { refresh() }, [])

  const items = health ? [
    { label: 'AI Assessment', status: health.aiStatus === 'ok', detail: health.aiStatus === 'ok' ? health.aiProvider : 'No API key configured' },
    { label: 'Monad Network', status: health.chainConnected, detail: health.chainConnected ? (health.rpcProvider === 'alchemy' ? 'Connected via Alchemy' : 'Connected') : 'Unreachable' },
    { label: '24h Error Count',  status: health.errors24h === 0, detail: `${health.errors24h} errors` },
  ] : []

  return (
    <PageLayout title="System Health" subtitle="Real-time system status" actions={
      <button onClick={refresh} className="text-body-md text-primary hover:underline flex items-center gap-1.5"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button>
    }>
      <div className="max-w-md space-y-3">
        {loading ? [1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />) : items.map(item => (
          <div key={item.label} className={`rounded-xl border p-5 flex items-center justify-between ${item.status ? 'bg-risk-low/10 border-risk-low/30' : 'bg-error-container/40 border-error/30'}`}>
            <div>
              <p className="text-body-md font-semibold text-ink">{item.label}</p>
              {item.detail && <p className="text-label-md text-ink-faint mt-0.5">{item.detail}</p>}
            </div>
            {item.status ? <CheckCircle2 size={22} className="text-risk-low" /> : <XCircle size={22} className="text-error" />}
          </div>
        ))}
        {health && <p className="text-label-md text-ink-faint px-1">Last updated: {formatDate(health.lastUpdated)}</p>}
      </div>
    </PageLayout>
  )
}

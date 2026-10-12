'use client'
import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { SystemHealth } from '@/types/admin'
import { Info } from 'lucide-react'

export default function AdminAIConfigPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)

  useEffect(() => {
    fetch('/api/admin/health').then((r) => r.json()).then(setHealth).catch(() => setHealth(null))
  }, [])

  const rows: [string, string][] = health
    ? [
        ['Case assessment model', health.aiProvider],
        ['API key', health.aiStatus === 'ok' ? 'Configured' : 'Not configured'],
        ['Language', 'English'],
        ['Role Persona', 'Asia trade finance risk-control expert'],
      ]
    : []

  return (
    <PageLayout title="AI Settings" subtitle="Active AI provider and model for case assessment">
      <div className="max-w-lg space-y-4">
        <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 space-y-1">
          {!health ? <Skeleton className="h-24 rounded-lg" /> : rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3 border-b border-border-subtle last:border-0">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-body-md font-medium text-ink font-mono text-right break-all">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-primary-fixed/30 rounded-xl border border-primary-fixed-dim p-4 flex items-start gap-2">
          <Info size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-body-md text-primary">API keys are stored as server-side environment variables and are never exposed to the browser.</p>
        </div>
      </div>
    </PageLayout>
  )
}

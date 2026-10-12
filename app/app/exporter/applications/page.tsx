'use client'
import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD, formatDate } from '@/lib/utils'
import { FinanceCase, CaseStage } from '@/types/case'
import { Plus } from 'lucide-react'

const STAGE_LABEL: Record<CaseStage, string> = {
  submitted: 'Submitted', ai_review: 'AI Review',
  credit_committee: 'Credit Committee', approved: 'Approved', rejected: 'Rejected',
}
const STAGE_TONE: Record<CaseStage, string> = {
  submitted: 'bg-surface-container-highest text-on-surface-variant',
  ai_review: 'bg-primary-fixed text-primary',
  credit_committee: 'bg-risk-medium/15 text-risk-medium',
  approved: 'bg-risk-low/15 text-risk-low',
  rejected: 'bg-risk-high/15 text-risk-high',
}

export default function ExporterApplicationsPage() {
  const [cases, setCases] = useState<FinanceCase[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mock/cases').then(r => r.json()).then(setCases)
      .catch(() => setError('Failed to load application list')).finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout title="My Applications" subtitle="Financing application tracking"
      actions={<a href="/exporter/apply" className="text-body-md px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 flex items-center gap-1.5 font-semibold"><Plus size={16} /> New Application</a>}>
      <DataWrapper data={cases} loading={loading} error={error}
        empty={<EmptyState title="No financing applications yet" description="Submit your first application to get started." action={{ label: 'Apply Now', href: '/exporter/apply' }} />}
        skeleton={<div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>}
      >
        {data => (
          <div className="space-y-3">
            {data.map(c => (
              <a key={c.id} href={`/exporter/status/${c.id}`} className="block bg-surface rounded-xl border border-border-subtle shadow-card p-5 hover:border-primary-container transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-body-md font-semibold text-ink font-mono">{c.id}</p>
                    <p className="text-label-md text-ink-faint mt-0.5">{formatDate(c.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-lg font-bold text-primary font-mono">{formatUSD(c.amount)}</p>
                    <span className={`text-label-md px-2 py-0.5 rounded-full font-medium ${STAGE_TONE[c.stage]}`}>{STAGE_LABEL[c.stage]}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </DataWrapper>
    </PageLayout>
  )
}

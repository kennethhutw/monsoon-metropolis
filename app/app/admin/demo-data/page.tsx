'use client'
import { PageLayout } from '@/components/shared/PageLayout'
import { MOCK_CASES } from '@/data/mockCases'
import { MOCK_ALERTS } from '@/data/mockAlerts'
import { MOCK_USERS } from '@/data/mockUsers'
import { AlertTriangle } from 'lucide-react'

export default function AdminDemoDataPage() {
  return (
    <PageLayout title="Demo Data" subtitle="System-preloaded mock data overview">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ label: 'Mock Cases', count: MOCK_CASES.length }, { label: 'Mock Alerts', count: MOCK_ALERTS.length }, { label: 'Demo Accounts', count: MOCK_USERS.length }].map(({ label, count }) => (
          <div key={label} className="bg-surface rounded-xl border border-border-subtle shadow-card p-5 text-center">
            <p className="text-headline-lg font-bold text-primary">{count}</p>
            <p className="text-body-md text-on-surface-variant mt-1">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-risk-medium/10 rounded-xl border border-risk-medium/30 p-5 flex items-start gap-3">
        <AlertTriangle size={18} className="text-risk-medium shrink-0 mt-0.5" />
        <div>
          <p className="text-body-md font-semibold text-ink mb-1">Mock Mode Notes</p>
          <p className="text-body-md text-on-surface-variant">All data is mocked and flagged <code className="bg-surface-container-highest px-1.5 py-0.5 rounded font-mono text-label-md">isMock: true</code>. Once Supabase is wired up, replace it via the TODOs in each API route.</p>
        </div>
      </div>
    </PageLayout>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { AuditLog } from '@/types/admin'

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/admin/audit-log').then(r => r.json()).then(setLogs).finally(() => setLoading(false)) }, [])
  return (
    <PageLayout title="Audit Log" subtitle="System operation records">
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
        <DataWrapper data={logs} loading={loading} error={null}
          empty={<EmptyState title="No records yet" />}
          skeleton={<div className="divide-y">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-none w-full" />)}</div>}
        >
          {data => (
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead className="bg-surface-container-low border-b border-border-subtle">
                  <tr>{['User','Action','Resource','Detail','Time'].map(h => <th key={h} className="text-left px-5 py-3 text-label-md font-medium text-ink-faint uppercase font-mono">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.map(l => (
                    <tr key={l.id}>
                      <td className="px-5 py-3.5 font-semibold text-ink font-mono text-label-md">{l.userEmail}</td>
                      <td className="px-5 py-3.5"><span className="text-label-md px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-mono">{l.action}</span></td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-mono text-label-md">{l.resource}</td>
                      <td className="px-5 py-3.5 text-ink-faint">{l.detail ?? '—'}</td>
                      <td className="px-5 py-3.5 text-ink-faint text-label-md">{formatDate(l.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataWrapper>
      </div>
    </PageLayout>
  )
}

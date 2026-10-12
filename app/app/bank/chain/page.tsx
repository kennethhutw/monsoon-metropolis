'use client'
import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD, formatDate } from '@/lib/utils'
import { ChainRecord, TxType } from '@/types/chain'
import { ArrowUpCircle, ArrowDownCircle, AlertTriangle, BadgeCheck, Link2 } from 'lucide-react'

const TX_LABEL: Record<TxType, string> = {
  disbursement: 'Disbursement', repayment: 'Repayment', anomaly: 'Anomaly Alert', identity_reg: 'Identity Registration'
}
const TX_TONE: Record<TxType, string> = {
  disbursement: 'bg-risk-low/15 text-risk-low', repayment: 'bg-primary-fixed text-primary',
  anomaly: 'bg-risk-high/15 text-risk-high', identity_reg: 'bg-surface-container-highest text-on-surface-variant',
}
const TX_ICON: Record<TxType, typeof ArrowUpCircle> = {
  disbursement: ArrowUpCircle, repayment: ArrowDownCircle, anomaly: AlertTriangle, identity_reg: BadgeCheck,
}

export default function BankChainPage() {
  const [records, setRecords] = useState<ChainRecord[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mock/chain').then(r => r.json()).then(setRecords)
      .catch(() => setError('Failed to load on-chain records')).finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout title="On-Chain Records" subtitle="Monad Testnet live transaction records">
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
        <DataWrapper data={records} loading={loading} error={error}
          empty={<EmptyState icon="⛓️" title="No on-chain records yet" />}
          skeleton={<div className="space-y-px">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-none w-full" />)}</div>}
        >
          {data => (
            <div className="divide-y divide-border-subtle">
              {data.map(r => {
                const Icon = TX_ICON[r.txType]
                return (
                  <div key={r.txHash} className="px-6 py-5">
                    <div className="flex items-start gap-4">
                      <span className={`p-2 rounded-lg shrink-0 ${TX_TONE[r.txType]}`}><Icon size={20} /></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-label-md font-medium px-2 py-0.5 rounded-full font-mono ${TX_TONE[r.txType]}`}>{TX_LABEL[r.txType]}</span>
                          <span className="text-label-md text-ink-faint font-mono">Block #{r.blockNumber}</span>
                          {!r.isRealHash && <span className="text-label-md px-1.5 py-0.5 rounded bg-risk-medium/15 text-risk-medium font-mono">MOCK</span>}
                        </div>
                        <p className="text-body-md font-semibold text-ink">{r.companyName}{r.amount ? ` — ${formatUSD(r.amount)}` : ''}</p>
                        {r.anomalyReason && <p className="text-body-md text-error mt-1 flex items-center gap-1"><AlertTriangle size={14} /> {r.anomalyReason}</p>}
                        {r.triggerCondition && <p className="text-body-md text-on-surface-variant mt-1">Trigger Condition: {r.triggerCondition}</p>}
                        <p className="font-mono text-label-md text-ink-faint mt-2 truncate flex items-center gap-1"><Link2 size={12} className="shrink-0" />{r.txHash}</p>
                      </div>
                      <span className="text-label-md text-ink-faint shrink-0">{formatDate(r.timestamp)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </DataWrapper>
      </div>
    </PageLayout>
  )
}

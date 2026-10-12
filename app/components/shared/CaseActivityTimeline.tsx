// Full on-chain activity history for a case — every milestone gets its own
// column on `cases` (see supabase/migrations/20260805010000_*.sql) so later
// actions never overwrite earlier ones. Shown regardless of role/page so
// "all records" for a case live in one place, not scattered per role.

import { explorerTxUrl } from '@/lib/contracts/config'
import type { FinanceCase } from '@/types/case'
import { CheckCircle2, XCircle, FileCheck, Send, Banknote, Coins, History } from 'lucide-react'

interface Milestone {
  key: string
  label: string
  at?: string
  txHash?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  tone: string
}

// bare=true skips the card chrome — used when the caller already provides
// its own container (e.g. a tab panel titled "On-Chain Activity").
export function CaseActivityTimeline({ c, bare }: { c: FinanceCase; bare?: boolean }) {
  const milestones: Milestone[] = [
    { key: 'mint', label: 'Invoice NFT minted', at: c.createdAt, txHash: c.chainTxHash, icon: Coins, tone: 'text-primary' },
    { key: 'confirm', label: 'Buyer confirmed receivable', at: c.buyerConfirmedAt, txHash: c.buyerConfirmedTxHash, icon: FileCheck, tone: 'text-risk-low' },
    { key: 'submit', label: 'Submitted for financing', at: c.submittedAt, txHash: c.submittedTxHash, icon: Send, tone: 'text-primary' },
    { key: 'approve', label: 'Approved by bank', at: c.approvedAt, txHash: c.approvedTxHash, icon: CheckCircle2, tone: 'text-risk-low' },
    { key: 'reject', label: 'Rejected by bank', at: c.rejectedAt, txHash: c.rejectedTxHash, icon: XCircle, tone: 'text-error' },
    { key: 'disburse', label: 'Funds disbursed', at: c.disbursedAt, txHash: c.disbursedTxHash, icon: Banknote, tone: 'text-primary' },
    { key: 'repay', label: 'Repaid in full', at: c.repaidAt, txHash: c.repaidTxHash, icon: CheckCircle2, tone: 'text-risk-low' },
  ].filter((m) => m.at)

  if (milestones.length === 0) return null

  const list = (
    <div className="space-y-4">
      {milestones.map((m) => {
        const Icon = m.icon
        return (
          <div key={m.key} className="flex items-start gap-3">
            <Icon size={18} className={`${m.tone} shrink-0 mt-0.5`} />
            <div className="min-w-0 flex-1">
              <p className="text-body-md font-semibold text-ink">{m.label}</p>
              <p className="text-label-md text-ink-faint mt-0.5">{new Date(m.at!).toLocaleString()}</p>
              {m.txHash && (
                <a
                  href={explorerTxUrl(m.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-label-md text-primary hover:underline font-mono break-all"
                >
                  {m.txHash}
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  if (bare) return list

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <History size={18} className="text-primary" />
        <h2 className="text-title-lg font-bold text-on-surface">On-Chain Activity</h2>
      </div>
      {list}
    </div>
  )
}

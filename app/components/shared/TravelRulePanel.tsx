'use client'
import { useEffect, useState } from 'react'
import { explorerTxUrl } from '@/lib/contracts/config'
import { Plane, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'

// Travel Rule (FATF Recommendation 16) compliance records — a record
// generator, NOT a real VASP-to-VASP transfer network. See
// docs/changes/20260807_TravelRule合規紀錄.md

interface TravelRuleRecord {
  id: string
  event_type: 'disbursement' | 'repayment'
  amount: number
  applicable: boolean
  customer_role: 'exporter' | 'buyer'
  customer_wallet: string
  customer_name: string | null
  customer_cvi_verified: boolean
  compliant: boolean
  tx_hash: string
  created_at: string
}

const EVENT_LABEL: Record<string, string> = { disbursement: 'Disbursement', repayment: 'Repayment' }

// refreshKey: bump this from the parent after an action that might create a
// new record (e.g. disburse) — this component only fetches on mount/caseNumber
// change otherwise, so a new record wouldn't appear until a manual reload.
export function TravelRulePanel({ caseNumber, refreshKey }: { caseNumber: string; refreshKey?: number }) {
  const [records, setRecords] = useState<TravelRuleRecord[] | null>(null)

  useEffect(() => {
    fetch(`/api/travel-rule?caseNumber=${encodeURIComponent(caseNumber)}`)
      .then((r) => r.json())
      .then((d) => setRecords(Array.isArray(d) ? d : []))
      .catch(() => setRecords([]))
  }, [caseNumber, refreshKey])

  if (!records || records.length === 0) return null

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <Plane size={18} className="text-primary" />
        <h2 className="text-title-lg font-bold text-on-surface">Travel Rule Compliance</h2>
      </div>
      <p className="text-label-md text-ink-faint mb-4">FATF Recommendation 16 record generator — not a live VASP-to-VASP transfer network.</p>
      <div className="space-y-3">
        {records.map((r) => (
          <div key={r.id} className={`rounded-lg border p-4 ${r.compliant ? 'bg-risk-low/10 border-risk-low/30' : 'bg-error-container/30 border-error/30'}`}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2">
                {r.compliant ? <CheckCircle2 size={16} className="text-risk-low shrink-0" /> : <AlertTriangle size={16} className="text-error shrink-0" />}
                <span className="text-body-md font-semibold text-ink">{EVENT_LABEL[r.event_type]}</span>
                {r.applicable
                  ? <span className="text-label-md px-1.5 py-0.5 rounded bg-risk-medium/15 text-risk-medium font-mono">Threshold applicable</span>
                  : <span className="text-label-md px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-mono">Below threshold</span>}
              </div>
              <span className="text-body-md font-mono text-ink">${r.amount.toLocaleString()}</span>
            </div>
            <p className="text-body-md text-on-surface-variant">
              {r.customer_role === 'exporter' ? 'Beneficiary' : 'Originator'}: {r.customer_name ?? '—'} ({r.customer_wallet.slice(0, 6)}…{r.customer_wallet.slice(-4)})
              {' — '}CVI {r.customer_cvi_verified ? 'verified' : 'not verified'}
            </p>
            <a href={explorerTxUrl(r.tx_hash)} target="_blank" rel="noopener noreferrer" className="text-label-md text-primary hover:underline flex items-center gap-1 mt-1">
              {r.tx_hash} <ExternalLink size={11} />
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

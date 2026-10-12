'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { AiAssessmentPanel } from '@/components/shared/AiAssessmentPanel'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatUSD, formatDate, getRiskColor, getRiskBg } from '@/lib/utils'
import { explorerAddressUrl } from '@/lib/contracts/config'
import { FinanceCase, CaseStage } from '@/types/case'
import {
  Search, ShieldCheck, CheckCircle2, XCircle, Bot, Link2,
  ExternalLink, ArrowRight, AlertTriangle,
} from 'lucide-react'

const STUCK_THRESHOLD_DAYS = 3
function isStuck(c: FinanceCase): boolean {
  if (c.stage === 'approved' || c.stage === 'rejected') return false
  return (Date.now() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24) > STUCK_THRESHOLD_DAYS
}

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
const RISK_LABEL: Record<'low' | 'medium' | 'high', string> = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }
const ACTIONABLE: CaseStage[] = ['submitted', 'ai_review', 'credit_committee']

function InfoField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <label className="text-label-md uppercase text-outline block mb-1 font-mono">{label}</label>
      <p className={`text-body-md font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

// ── Right-hand detail panel ────────────────────────────────
function CaseDetailPanel({
  caseId,
  onStageChange,
}: {
  caseId: string
  onStageChange: (id: string, stage: CaseStage) => void
}) {
  const [c, setC]               = useState<FinanceCase | null>(null)
  const [stage, setStage]       = useState<CaseStage | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    setC(null); setStage(null); setNotFound(false)
    setDataLoading(true)
    fetch(`/api/mock/cases/${caseId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); setDataLoading(false); return }
        setC(data); setStage(data.stage)
        setDataLoading(false)
      })
      .catch(() => { setNotFound(true); setDataLoading(false) })
  }, [caseId])

  const updateStage = async (newStage: CaseStage) => {
    if (!c) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/mock/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      if (!res.ok) throw new Error()
      setStage(newStage)
      onStageChange(caseId, newStage)
      if (newStage === 'approved') toast.success('Case Approved', { description: `${c.companyName}'s financing application has been approved` })
      if (newStage === 'rejected') toast.error('Case Rejected', { description: `${c.companyName}'s financing application has been rejected` })
    } catch {
      toast.error('Action Failed', { description: 'Please try again later' })
    } finally {
      setActionLoading(false)
    }
  }

  if (notFound) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-body-md text-ink-faint">Case {caseId} not found</p>
    </div>
  )

  if (dataLoading || !c) return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )

  const currentStage = stage ?? c.stage
  const canAction = ACTIONABLE.includes(currentStage)
  const financeTypeLabel = { receivables: 'Receivables', supply_chain: 'Supply Chain Financing', trade: 'Trade Finance' }[c.financeType]

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="max-w-[1000px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-end pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-label-md font-bold rounded-md uppercase font-mono">{financeTypeLabel}</span>
              <span className="text-on-surface-variant text-label-md">• Submitted {formatDate(c.createdAt)}</span>
            </div>
            <h2 className="text-headline-lg font-bold text-on-surface">{c.companyName}</h2>
            <p className="text-on-surface-variant mt-1">Financing Application • {c.id}</p>
          </div>
          <a href={`/bank/cases/${c.id}`} className="px-5 py-2.5 bg-surface border border-border-subtle rounded-lg text-on-surface text-body-md font-semibold hover:bg-surface-container-low transition-colors flex items-center gap-2 shrink-0">
            <ExternalLink size={18} /> Full Page
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-surface rounded-xl border border-border-subtle p-6 shadow-card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-title-lg font-bold">Invoice Details</h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-lg border border-border-subtle">
                  <ShieldCheck size={16} className="text-primary" />
                  <span className="text-code-sm text-primary font-mono">CVA SECURED</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <InfoField label="Case ID" value={c.id} mono />
                <InfoField label="Facility Amount" value={<span className="text-primary font-bold">{formatUSD(c.amount)}</span>} />
                <InfoField label="Buyer Concentration" value={
                  <span className={c.buyerConcentration > 70 ? 'text-error font-bold' : ''}>{c.buyerConcentration}%</span>
                } />
                <InfoField label="Review Stage" value={
                  <span className={`px-2 py-0.5 rounded-full text-label-md font-medium ${STAGE_TONE[currentStage]}`}>{STAGE_LABEL[currentStage]}</span>
                } />
                {c.exporterWallet && (
                  <div className="col-span-2">
                    <label className="text-label-md uppercase text-outline block mb-1 font-mono">Exporter Wallet</label>
                    <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-border-subtle">
                      <Link2 size={16} className="text-outline shrink-0" />
                      <a href={explorerAddressUrl(c.exporterWallet)} target="_blank" rel="noopener noreferrer" className="text-code-sm text-primary hover:underline truncate flex-1 font-mono">{c.exporterWallet}</a>
                    </div>
                  </div>
                )}
                {c.buyerWallet && (
                  <div className="col-span-2">
                    <label className="text-label-md uppercase text-outline block mb-1 font-mono">Buyer Wallet</label>
                    <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-border-subtle">
                      <Link2 size={16} className="text-outline shrink-0" />
                      <a href={explorerAddressUrl(c.buyerWallet)} target="_blank" rel="noopener noreferrer" className="text-code-sm text-primary hover:underline truncate flex-1 font-mono">{c.buyerWallet}</a>
                    </div>
                  </div>
                )}
                {c.chainTxHash && (
                  <div className="col-span-2">
                    <label className="text-label-md uppercase text-outline block mb-1 font-mono">On-Chain Tx Hash</label>
                    <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-border-subtle">
                      <Link2 size={16} className="text-outline shrink-0" />
                      <code className="text-code-sm text-on-surface truncate flex-1 font-mono">{c.chainTxHash}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="text-center bg-surface rounded-xl border border-border-subtle p-6 shadow-card">
              <p className="text-body-md text-on-surface-variant mb-1">Risk Score</p>
              <p className="text-headline-lg font-bold" style={{ color: getRiskColor(c.riskLevel) }}>{c.riskScore}</p>
              <p className="text-label-md text-ink-faint mb-2">/ 100 pts</p>
              <span className="inline-block text-label-md font-medium px-3 py-1 rounded-full"
                style={{ color: getRiskColor(c.riskLevel), background: getRiskBg(c.riskLevel) }}>
                {RISK_LABEL[c.riskLevel]}
              </span>
            </div>

            <div className="bg-primary/[0.03] rounded-xl border border-border-subtle shadow-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle">
                <Bot size={18} className="text-primary" />
                <h3 className="text-title-lg font-bold">AI Assessment</h3>
              </div>
              <div className="p-5">
                <AiAssessmentPanel key={c.id} caseNumber={c.id} caseData={c} />
              </div>
            </div>

            {canAction ? (
              <div className="bg-surface rounded-xl border border-border-subtle p-6 shadow-card space-y-3">
                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={actionLoading}
                    className="w-full bg-primary py-3.5 rounded-lg text-white text-body-md font-bold hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Approve Facility
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm approval of this case?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to approve <strong>{c.companyName}</strong>&apos;s financing application ({formatUSD(c.amount)}).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-primary hover:opacity-90" onClick={() => updateStage('approved')}>Confirm Approval</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={actionLoading}
                    className="w-full bg-transparent border border-outline py-3.5 rounded-lg text-on-surface text-body-md font-bold hover:bg-surface-container-low transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Reject Application
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm rejection of this case?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to reject <strong>{c.companyName}</strong>&apos;s financing application. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-error hover:opacity-90" onClick={() => updateStage('rejected')}>Confirm Rejection</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-center text-label-md text-outline px-2">
                  By approving, you confirm all risk parameters have been reviewed per Monsoon Institutional Policy.
                </p>
              </div>
            ) : (
              <div className="bg-surface rounded-xl border border-border-subtle p-6 shadow-card flex items-center justify-center">
                <span className={`text-body-md font-medium px-3 py-1.5 rounded-full ${STAGE_TONE[currentStage]}`}>{STAGE_LABEL[currentStage]}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────
export default function BankCasesPage() {
  const [cases, setCases]           = useState<FinanceCase[] | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (stageFilter) p.set('stage', stageFilter)
    if (riskFilter) p.set('riskLevel', riskFilter)
    fetch(`/api/mock/cases?${p}`)
      .then(r => r.json()).then(data => { setCases(data); if (!selectedId && data.length > 0) setSelectedId(data[0].id) })
      .catch(() => setError('Failed to load case list'))
      .finally(() => setLoading(false))
  }, [search, stageFilter, riskFilter])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleStageChange = useCallback((id: string, newStage: CaseStage) => {
    setCases(prev => prev ? prev.map(c => c.id === id ? { ...c, stage: newStage } : c) : prev)
  }, [])

  return (
    <PageLayout title="Case Management" subtitle="All financing application cases">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <Input placeholder="Search cases, IDs, or SME names..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-10 pl-9 bg-surface-container-low border-none rounded-lg" />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="h-10 text-body-md border border-border-subtle rounded-lg px-3 bg-surface text-on-surface-variant">
          <option value="">All Stages</option>
          {(Object.keys(STAGE_LABEL) as CaseStage[]).map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)}
          className="h-10 text-body-md border border-border-subtle rounded-lg px-3 bg-surface text-on-surface-variant">
          <option value="">All Risk Levels</option>
          <option value="high">High Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="low">Low Risk</option>
        </select>
        {cases && <span className="ml-auto text-body-md text-ink-faint self-center">{cases.length} cases</span>}
      </div>

      {/* Split view */}
      <div className="flex gap-4 h-[calc(100vh-15rem)] min-h-[540px]">
        {/* Left: case list */}
        <div className="w-[400px] shrink-0 bg-surface rounded-xl border border-border-subtle shadow-card flex flex-col overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="p-4 text-body-md text-error">{error}</div>
          ) : !cases || cases.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-body-lg font-medium text-ink">No cases yet</p>
                <button onClick={() => { setSearch(''); setStageFilter(''); setRiskFilter('') }}
                  className="text-body-md text-primary hover:underline mt-1">Clear Filters</button>
              </div>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {cases.map(c => (
                <button key={c.id} onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-4 border-b border-border-subtle transition-colors ${
                    selectedId === c.id ? 'bg-primary-fixed/30' : 'hover:bg-surface-container-low'
                  }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className={`text-label-md mb-0.5 font-mono ${selectedId === c.id ? 'text-primary' : 'text-outline'}`}>{c.id}</p>
                      <h3 className="text-body-md font-bold text-on-surface">{c.companyName}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isStuck(c) && (
                        <span title={`No movement in over ${STUCK_THRESHOLD_DAYS} days`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-label-md bg-risk-medium/15 text-risk-medium">
                          <AlertTriangle size={11} /> Stuck
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-label-md uppercase font-mono"
                        style={{ color: getRiskColor(c.riskLevel), background: getRiskBg(c.riskLevel) }}>
                        {c.riskLevel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <p className="text-body-md font-mono">{formatUSD(c.amount)}</p>
                    <span className={`text-label-md px-1.5 py-0.5 rounded-full font-medium ${STAGE_TONE[c.stage]}`}>{STAGE_LABEL[c.stage]}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 bg-background rounded-xl border border-border-subtle overflow-hidden">
          {selectedId ? (
            <CaseDetailPanel
              key={selectedId}
              caseId={selectedId}
              onStageChange={handleStageChange}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-body-md text-ink-faint flex items-center gap-2"><ArrowRight size={16} className="rotate-180" /> Select a case to view details</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}

'use client'
import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD, formatDate, getRiskColor, getRiskBg } from '@/lib/utils'
import { DashboardStats } from '@/data/mockStats'
import { FinanceCase, CaseStage } from '@/types/case'
import {
  Wallet, Clock, AlertTriangle, Network, Bot, RefreshCw, ArrowRight,
  ShieldCheck, FileUp, Handshake, BrainCircuit, CheckCircle2, Landmark,
  Bell, ShieldAlert, Link2, FolderOpen,
} from 'lucide-react'

// ── Financing review flow ─────────────────────────────────
const FLOW_STEPS = [
  { label: 'On-Chain Application',  icon: FileUp,       done: true  },
  { label: 'Smart Verification',    icon: ShieldCheck,  done: true  },
  { label: 'AI Risk Review',        icon: BrainCircuit, active: true },
  { label: 'Credit Committee',      icon: Handshake,    pending: true },
  { label: 'On-Chain Disbursement', icon: CheckCircle2, pending: true },
  { label: 'Repayment Monitoring',  icon: Landmark,      pending: true },
]

function FlowSteps() {
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-8">
      <h2 className="text-title-lg text-on-surface mb-8">Standard Approval Sequence</h2>
      <div className="relative flex items-center justify-between overflow-x-auto gap-2 pb-1">
        <div className="hidden md:block absolute top-6 left-0 w-full h-[2px] bg-surface-container-highest -z-0" />
        {FLOW_STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="relative z-10 flex flex-col items-center text-center shrink-0 w-24">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border-4 border-surface ${
                s.done   ? 'bg-primary text-white' :
                s.active ? 'bg-primary-fixed text-primary ring-2 ring-primary' :
                           'bg-surface-container-highest text-ink-faint'
              }`}>
                <Icon size={18} />
              </div>
              <span className="text-label-md font-medium text-ink-muted">{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Financing pipeline ────────────────────────────────────
const PIPELINE_STAGES: { stage: CaseStage; label: string; color: string }[] = [
  { stage: 'submitted',        label: 'Submitted',        color: 'var(--primary-container)' },
  { stage: 'ai_review',        label: 'AI Review',        color: 'var(--secondary-container)' },
  { stage: 'credit_committee', label: 'Credit Committee', color: 'var(--risk-medium)' },
  { stage: 'approved',         label: 'Approved',         color: 'var(--risk-low)' },
]

function PipelineSection({ cases }: { cases: FinanceCase[] }) {
  const counts = PIPELINE_STAGES.map(p => ({
    ...p,
    count: cases.filter(c => c.stage === p.stage).length,
  }))
  const max = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
      <h2 className="text-title-lg text-on-surface mb-6">Pipeline Distribution</h2>
      <div className="space-y-4">
        {counts.map(c => (
          <div key={c.stage} className="flex items-center gap-3">
            <span className="text-body-md text-on-surface-variant w-32 shrink-0">{c.label}</span>
            <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(c.count / max) * 100}%`, background: c.color }} />
            </div>
            <span className="text-body-md font-semibold text-ink w-6 text-right">{c.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Risk distribution donut ───────────────────────────────
function DonutChart({ cases }: { cases: FinanceCase[] }) {
  const counts = {
    low:    cases.filter(c => c.riskLevel === 'low').length,
    medium: cases.filter(c => c.riskLevel === 'medium').length,
    high:   cases.filter(c => c.riskLevel === 'high').length,
  }
  const total = counts.low + counts.medium + counts.high || 1
  const C = 502  // 2π × 80

  const lowArc  = (counts.low    / total) * C
  const medArc  = (counts.medium / total) * C
  const highArc = (counts.high   / total) * C

  const pct = (n: number) => Math.round((n / total) * 100)

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 flex flex-col">
      <h2 className="text-title-lg text-on-surface mb-6">Weekly Risk Distribution</h2>
      <div className="flex-1 flex items-center justify-center relative">
        <svg viewBox="0 0 192 192" width="160" height="160" className="-rotate-90 shrink-0">
          <circle cx="96" cy="96" r="80" fill="none" stroke="var(--surface-container-low)" strokeWidth="20" />
          {lowArc > 0 && (
            <circle cx="96" cy="96" r="80" fill="none" stroke="var(--risk-low)" strokeWidth="20"
              strokeDasharray={`${lowArc} ${C}`} strokeDashoffset="0" />
          )}
          {medArc > 0 && (
            <circle cx="96" cy="96" r="80" fill="none" stroke="var(--risk-medium)" strokeWidth="20"
              strokeDasharray={`${medArc} ${C}`} strokeDashoffset={`-${lowArc}`} />
          )}
          {highArc > 0 && (
            <circle cx="96" cy="96" r="80" fill="none" stroke="var(--risk-high)" strokeWidth="20"
              strokeDasharray={`${highArc} ${C}`} strokeDashoffset={`-${lowArc + medArc}`} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-headline-md font-bold text-on-surface">{total}</span>
          <span className="text-body-md text-on-surface-variant">Total Apps</span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {[
          { label: 'Low Risk',    color: 'var(--risk-low)',    pct: pct(counts.low),    n: counts.low    },
          { label: 'Medium Risk', color: 'var(--risk-medium)', pct: pct(counts.medium), n: counts.medium },
          { label: 'High Risk',   color: 'var(--risk-high)',   pct: pct(counts.high),   n: counts.high   },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="text-body-md text-on-surface-variant">{r.label}</span>
            </div>
            <span className="text-label-md font-semibold text-ink">{r.pct}% · {r.n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Stat cards ─────────────────────────────────────────────
function StatCard({ label, value, sub, trend, icon: Icon, tone }: {
  label: string; value: string; sub?: string; trend?: string
  icon: typeof Wallet; tone: 'primary' | 'risk-high' | 'tertiary'
}) {
  const toneClasses = {
    primary: 'text-primary bg-primary-fixed/40',
    'risk-high': 'text-risk-high bg-error-container/40',
    tertiary: 'text-tertiary bg-tertiary-fixed/40',
  }[tone]
  const valueClasses = {
    primary: 'text-primary',
    'risk-high': 'text-error',
    tertiary: 'text-tertiary',
  }[tone]

  return (
    <div className="bg-surface p-6 rounded-xl border border-border-subtle shadow-card">
      <div className="flex justify-between items-start mb-4">
        <span className={`p-2 rounded-lg ${toneClasses}`}><Icon size={20} /></span>
        {trend && <span className="text-risk-low text-label-md font-medium">{trend}</span>}
      </div>
      <p className="text-on-surface-variant text-body-md mb-1">{label}</p>
      <h3 className={`text-headline-md font-semibold ${valueClasses}`}>{value}</h3>
      {sub && <p className="text-label-md text-ink-faint mt-1">{sub}</p>}
    </div>
  )
}

// ── AI suggestions panel ───────────────────────────────────
const AI_CHIPS = [
  { label: "This Week's High-Risk Cases", query: "What are this week's highest-risk cases? Analyze from a bank risk-control perspective." },
  { label: 'Supply Chain Health',         query: 'Assess the overall health of the supply chain financing portfolio.' },
  { label: 'Overdue Rate Forecast',       query: 'Forecast the future overdue rate trend from a bank risk-control perspective.' },
]

function AISuggestions({ stats }: { stats: DashboardStats | null }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [activeChip, setActiveChip] = useState<string | null>(null)

  const fetchAI = async (query?: string) => {
    if (!stats) return
    setLoading(true)
    setActiveChip(query ?? null)
    try {
      const res = await window.fetch('/api/ai/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, query }),
      })
      const data = await res.json()
      setText(data.suggestions)
      setIsFallback(data.isFallback)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAI() }, [stats])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-primary/[0.03] rounded-xl border border-border-subtle shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-primary" />
          <span className="text-body-lg font-semibold text-on-surface">AI Insights</span>
          {isFallback && <span className="text-label-md px-1.5 py-0.5 rounded bg-risk-medium/15 text-risk-medium font-mono">Fallback</span>}
        </div>
        <button onClick={() => fetchAI(activeChip ?? undefined)} disabled={loading}
          className="text-primary hover:opacity-80 disabled:opacity-40 transition-opacity">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="p-5 min-h-[90px]">
        {loading
          ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></div>
          : <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">{text}</p>
        }
      </div>
      <div className="flex flex-col gap-2 px-5 pb-5">
        {AI_CHIPS.map(c => (
          <button key={c.label} onClick={() => fetchAI(c.query)} disabled={loading}
            className={`text-left text-body-md px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 ${
              activeChip === c.query
                ? 'border-primary-container bg-primary-fixed/40 text-primary'
                : 'border-border-subtle text-on-surface-variant hover:border-primary-container hover:text-primary'
            }`}>
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Recent cases list ──────────────────────────────────────
const STAGE_LABEL: Record<string, string> = {
  submitted: 'Submitted', ai_review: 'AI Review',
  credit_committee: 'Credit Committee', approved: 'Approved', rejected: 'Rejected',
}
const STAGE_TONE: Record<string, string> = {
  submitted: 'bg-surface-container-highest text-on-surface-variant',
  ai_review: 'bg-primary-fixed text-primary',
  credit_committee: 'bg-risk-medium/15 text-risk-medium',
  approved: 'bg-risk-low/15 text-risk-low',
  rejected: 'bg-risk-high/15 text-risk-high',
}

function CaseRow({ c }: { c: FinanceCase }) {
  return (
    <a href={`/bank/cases/${c.id}`} className="flex items-center gap-3 py-4 px-2 hover:bg-surface-container-low transition-colors rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-md font-semibold text-ink truncate">{c.companyName}</span>
          <span className="text-label-md text-ink-faint font-mono">{c.id}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-label-md text-ink-faint">{formatDate(c.createdAt)}</span>
          <span className={`text-label-md px-1.5 py-0.5 rounded-full font-medium ${STAGE_TONE[c.stage] ?? ''}`}>{STAGE_LABEL[c.stage] ?? c.stage}</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-body-md font-semibold text-ink font-mono">{formatUSD(c.amount)}</p>
        <span className="text-label-md font-medium px-1.5 py-0.5 rounded-full font-mono"
          style={{ color: getRiskColor(c.riskLevel), background: getRiskBg(c.riskLevel) }}>
          {c.riskScore} pts
        </span>
      </div>
    </a>
  )
}

// ── Main page ────────────────────────────────────────────
export default function BankDashboardPage() {
  const [stats, setStats]             = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError]   = useState<string | null>(null)

  const [allCases, setAllCases]       = useState<FinanceCase[] | null>(null)
  const [casesLoading, setCasesLoading] = useState(true)
  const [casesError, setCasesError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mock/stats')
      .then(r => r.json()).then(setStats)
      .catch(() => setStatsError('Failed to load statistics'))
      .finally(() => setStatsLoading(false))

    fetch('/api/mock/cases')
      .then(r => r.json()).then(setAllCases)
      .catch(() => setCasesError('Failed to load case list'))
      .finally(() => setCasesLoading(false))
  }, [])

  const recentCases = allCases?.slice(0, 5) ?? null

  return (
    <PageLayout
      title="Financing Overview"
      subtitle="Bank Corporate Finance Division — Real-Time Risk Dashboard"
      actions={<a href="/bank/cases" className="text-body-md text-primary hover:underline flex items-center gap-1">View All Cases <ArrowRight size={14} /></a>}
    >
      <div className="space-y-6">
        {/* Stat cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : statsError ? (
          <div className="bg-error-container/40 rounded-xl p-4 text-body-md text-error">{statsError}</div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Approved This Month" value={formatUSD(stats.approvedAmountThisMonth)} icon={Wallet} tone="primary" trend="+12.5%" />
            <StatCard label="Pending Cases"       value={`${stats.pendingCasesCount}`} icon={Clock} tone="primary" />
            <StatCard label="Avg. Processing Time" value={`${stats.avgProcessingDays}d`} icon={Clock} tone="primary" trend="-1.2d" />
            <StatCard label="Overdue Rate"        value={`${stats.overdueRate}%`} icon={AlertTriangle} tone="risk-high" sub="Below 2% alert threshold" />
            <StatCard label="On-Chain Data Coverage" value={`${stats.chainDataCoverageRate}%`} icon={Network} tone="tertiary" />
          </div>
        ) : null}

        {/* Financing review flow */}
        <FlowSteps />

        {/* Financing pipeline + risk distribution */}
        {casesLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-64 rounded-xl lg:col-span-2" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : allCases ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2"><PipelineSection cases={allCases} /></div>
            <DonutChart cases={allCases} />
          </div>
        ) : null}

        {/* Recent cases + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-title-lg text-on-surface">Recent Transaction Cases</h2>
              <a href="/bank/cases" className="text-body-md text-primary hover:underline flex items-center gap-1">All <ArrowRight size={14} /></a>
            </div>
            <DataWrapper data={recentCases} loading={casesLoading} error={casesError}
              empty={<EmptyState title="No financing cases yet" description="There are no cases requiring review at this time." />}
              skeleton={<div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>}
            >
              {data => <div className="divide-y divide-border-subtle">{data.map(c => <CaseRow key={c.id} c={c} />)}</div>}
            </DataWrapper>
          </div>

          <div className="flex flex-col gap-4">
            <AISuggestions stats={stats} />
            <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-5">
              <h2 className="text-title-lg text-on-surface mb-3">Quick Links</h2>
              <div className="space-y-1">
                {[
                  { href: '/bank/alerts', label: 'Alert Center',     icon: Bell },
                  { href: '/bank/risk',   label: 'Risk Analysis',    icon: ShieldAlert },
                  { href: '/bank/chain',  label: 'On-Chain Records', icon: Link2 },
                  { href: '/bank/cases',  label: 'All Cases',        icon: FolderOpen },
                ].map(item => (
                  <a key={item.href} href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors">
                    <item.icon size={18} /><span>{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

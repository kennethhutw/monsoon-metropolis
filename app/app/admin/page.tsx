'use client'
import { useEffect, useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { SystemHealth, AuditLog } from '@/types/admin'
import { DashboardStats } from '@/data/mockStats'
import { FinanceCase, CaseStage } from '@/types/case'
import { formatUSD, formatDate } from '@/lib/utils'
import { contractAddresses, explorerAddressUrl } from '@/lib/contracts/config'
import { isRealContractMode } from '@/hooks/useWallet'
import {
  Users, Settings, ClipboardCheck, Activity, Bot, Link2, CheckCircle2, XCircle,
  Wallet, Clock, AlertTriangle, Network, RefreshCw, ArrowRight, Newspaper, ShieldAlert,
} from 'lucide-react'

const STUCK_THRESHOLD_DAYS = 3

interface RiskOverviewRow {
  caseNumber: string
  companyName: string
  buyerName: string | null
  riskScore: number
  stage: CaseStage
  latestScan: { summary: string; searchedAt: string } | null
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Wallet; tone: 'primary' | 'risk-high' | 'tertiary' }) {
  const toneClasses = { primary: 'text-primary bg-primary-fixed/40', 'risk-high': 'text-risk-high bg-error-container/40', tertiary: 'text-tertiary bg-tertiary-fixed/40' }[tone]
  const valueClasses = { primary: 'text-primary', 'risk-high': 'text-error', tertiary: 'text-tertiary' }[tone]
  return (
    <div className="bg-surface p-5 rounded-xl border border-border-subtle shadow-card">
      <span className={`inline-flex p-2 rounded-lg mb-3 ${toneClasses}`}><Icon size={18} /></span>
      <p className="text-on-surface-variant text-body-md mb-1">{label}</p>
      <h3 className={`text-headline-md font-semibold ${valueClasses}`}>{value}</h3>
    </div>
  )
}

function StuckCasesPanel({ cases, loading }: { cases: FinanceCase[] | null; loading: boolean }) {
  const stuck = cases?.filter(c => c.stage !== 'approved' && c.stage !== 'rejected' && daysSince(c.updatedAt) > STUCK_THRESHOLD_DAYS)
    .sort((a, b) => daysSince(b.updatedAt) - daysSince(a.updatedAt))
    .slice(0, 5) ?? []

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle">
        <AlertTriangle size={18} className="text-risk-medium" />
        <h2 className="text-title-lg font-bold">Stuck Cases</h2>
        <span className="text-label-md text-ink-faint ml-1">no movement &gt; {STUCK_THRESHOLD_DAYS}d</span>
      </div>
      <div className="p-2">
        {loading ? (
          <div className="p-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
        ) : stuck.length === 0 ? (
          <p className="text-body-md text-on-surface-variant p-4">Nothing stuck right now.</p>
        ) : (
          stuck.map(c => (
            <a key={c.id} href={`/bank/cases/${c.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors">
              <div className="min-w-0">
                <p className="text-body-md font-semibold text-ink truncate">{c.companyName}</p>
                <p className="text-label-md text-ink-faint font-mono">{c.id} · {c.stage}</p>
              </div>
              <span className="text-label-md font-medium px-2 py-0.5 rounded-full bg-risk-medium/15 text-risk-medium shrink-0">
                {Math.floor(daysSince(c.updatedAt))}d
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  )
}

function RiskOverviewPanel({ rows, loading }: { rows: RiskOverviewRow[] | null; loading: boolean }) {
  const top = rows?.slice(0, 5) ?? []
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle">
        <ShieldAlert size={18} className="text-error" />
        <h2 className="text-title-lg font-bold">High-Risk Companies</h2>
      </div>
      <div className="p-2">
        {loading ? (
          <div className="p-3 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : top.length === 0 ? (
          <p className="text-body-md text-on-surface-variant p-4">No high-risk cases right now.</p>
        ) : (
          top.map(r => (
            <a key={r.caseNumber} href={`/bank/cases/${r.caseNumber}`} className="block px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors">
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-md font-semibold text-ink truncate">{r.companyName}</p>
                <span className="text-label-md font-medium px-2 py-0.5 rounded-full bg-error-container/40 text-error shrink-0">{r.riskScore} pts</span>
              </div>
              <p className="text-label-md text-ink-faint mt-0.5 flex items-center gap-1">
                <Newspaper size={12} className="shrink-0" />
                {r.latestScan ? r.latestScan.summary.slice(0, 90) : 'Not yet scanned for news'}
              </p>
            </a>
          ))
        )}
      </div>
    </div>
  )
}

function ContractAddressesCard() {
  if (!isRealContractMode) return null
  const addresses = [
    { label: 'ComplianceRegistry', address: contractAddresses.complianceRegistry },
    { label: 'InvoiceAsset', address: contractAddresses.invoiceAsset },
    { label: 'FinancingPool', address: contractAddresses.financingPool },
    { label: 'Stablecoin', address: contractAddresses.stablecoin },
  ]
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border-subtle">
        <Link2 size={18} className="text-primary" />
        <h2 className="text-title-lg font-bold">Smart Contracts</h2>
      </div>
      <div className="p-3 space-y-1">
        {addresses.map(a => (
          <a key={a.label} href={explorerAddressUrl(a.address)} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="text-body-md text-on-surface-variant">{a.label}</span>
            <code className="text-code-sm text-primary font-mono">{a.address.slice(0, 6)}…{a.address.slice(-4)}</code>
          </a>
        ))}
      </div>
    </div>
  )
}

function RecentActivityCard() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  useEffect(() => { fetch('/api/admin/audit-log').then(r => r.json()).then((data) => setLogs(Array.isArray(data) ? data.slice(0, 5) : [])) }, [])
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <h2 className="text-title-lg font-bold">Recent Admin Activity</h2>
        <a href="/admin/audit-log" className="text-body-md text-primary hover:underline flex items-center gap-1">All <ArrowRight size={14} /></a>
      </div>
      <div className="p-2">
        {logs === null ? (
          <div className="p-3 space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : logs.length === 0 ? (
          <p className="text-body-md text-on-surface-variant p-4">No admin actions recorded yet.</p>
        ) : (
          logs.map(l => (
            <div key={l.id} className="px-3 py-2.5">
              <p className="text-body-md text-ink"><span className="font-semibold">{l.userEmail}</span> — {l.action.replace(/_/g, ' ').toLowerCase()}</p>
              <p className="text-label-md text-ink-faint">{formatDate(l.timestamp)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function AISummary({ context }: { context: { stats: DashboardStats | null; stuckCount: number; highRiskCount: number } | null }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFallback, setIsFallback] = useState(false)

  const fetchAI = async () => {
    if (!context?.stats) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: context.stats,
          query: `Platform status today: ${context.stuckCount} cases stuck (no movement > ${STUCK_THRESHOLD_DAYS} days), ${context.highRiskCount} high-risk cases open. Give a one-paragraph risk-control summary and what to check first.`,
        }),
      })
      const data = await res.json()
      setText(data.suggestions)
      setIsFallback(data.isFallback)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAI() }, [context])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-primary/[0.03] rounded-xl border border-border-subtle shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-primary" />
          <span className="text-body-lg font-semibold text-on-surface">AI Daily Summary</span>
          {isFallback && <span className="text-label-md px-1.5 py-0.5 rounded bg-risk-medium/15 text-risk-medium font-mono">Fallback</span>}
        </div>
        <button onClick={fetchAI} disabled={loading} className="text-primary hover:opacity-80 disabled:opacity-40 transition-opacity">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="p-5 min-h-[80px]">
        {loading ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
          : <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">{text}</p>}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [cases, setCases] = useState<FinanceCase[] | null>(null)
  const [casesLoading, setCasesLoading] = useState(true)
  const [riskRows, setRiskRows] = useState<RiskOverviewRow[] | null>(null)
  const [riskLoading, setRiskLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/health').then(r => r.json()).then(setHealth)
    fetch('/api/mock/stats').then(r => r.json()).then(setStats)
    fetch('/api/mock/cases').then(r => r.json()).then(setCases).finally(() => setCasesLoading(false))
    fetch('/api/admin/risk-overview').then(r => r.json()).then(setRiskRows).finally(() => setRiskLoading(false))
  }, [])

  const stuckCount = cases?.filter(c => c.stage !== 'approved' && c.stage !== 'rejected' && daysSince(c.updatedAt) > STUCK_THRESHOLD_DAYS).length ?? 0
  const highRiskCount = riskRows?.length ?? 0

  const links = [
    { href:'/admin/users',      label:'User Management',    icon: Users },
    { href:'/admin/thresholds', label:'Threshold Settings',  icon: Settings },
    { href:'/admin/audit-log',  label:'Audit Log',           icon: ClipboardCheck },
    { href:'/admin/health',     label:'System Health',       icon: Activity },
    { href:'/admin/ai-config',  label:'AI Settings',         icon: Bot },
    { href:'/admin/contracts',  label:'Contract Management', icon: Link2 },
  ]

  return (
    <PageLayout title="Platform Overview" subtitle="Admin control tower — what needs attention today">
      <div className="space-y-6">
        {/* Stat cards */}
        {!stats ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Approved This Month" value={formatUSD(stats.approvedAmountThisMonth)} icon={Wallet} tone="primary" />
            <StatCard label="Pending Cases" value={`${stats.pendingCasesCount}`} icon={Clock} tone="primary" />
            <StatCard label="Stuck Cases" value={`${stuckCount}`} icon={AlertTriangle} tone="risk-high" />
            <StatCard label="High-Risk Cases" value={`${highRiskCount}`} icon={ShieldAlert} tone="risk-high" />
            <StatCard label="On-Chain Data Coverage" value={`${stats.chainDataCoverageRate}%`} icon={Network} tone="tertiary" />
          </div>
        )}

        {/* System health */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!health ? <Skeleton className="h-20 rounded-xl" /> : (
            <div className={`rounded-xl border p-4 flex items-center justify-between ${health.aiStatus === 'ok' ? 'bg-risk-low/10 border-risk-low/30' : 'bg-error-container/40 border-error/30'}`}>
              <p className="text-body-md font-semibold text-ink">AI Provider <span className="text-label-md text-ink-faint font-normal">· {health.aiStatus === 'ok' ? health.aiProvider : 'No API key configured'}</span></p>
              {health.aiStatus === 'ok' ? <CheckCircle2 size={20} className="text-risk-low" /> : <XCircle size={20} className="text-error" />}
            </div>
          )}
          {!health ? <Skeleton className="h-20 rounded-xl" /> : (
            <div className={`rounded-xl border p-4 flex items-center justify-between ${health.chainConnected ? 'bg-risk-low/10 border-risk-low/30' : 'bg-risk-medium/10 border-risk-medium/30'}`}>
              <p className="text-body-md font-semibold text-ink">Monad Network — {health.chainConnected ? (health.rpcProvider === 'alchemy' ? 'Connected via Alchemy' : 'Connected') : 'Unreachable'}</p>
              {health.chainConnected ? <CheckCircle2 size={20} className="text-risk-low" /> : <XCircle size={20} className="text-risk-medium" />}
            </div>
          )}
        </div>

        {/* Needs attention */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StuckCasesPanel cases={cases} loading={casesLoading} />
          <RiskOverviewPanel rows={riskRows} loading={riskLoading} />
        </div>

        <AISummary context={stats ? { stats, stuckCount, highRiskCount } : null} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContractAddressesCard />
          <RecentActivityCard />
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {links.map(l => (
            <a key={l.href} href={l.href} className="bg-surface rounded-xl border border-border-subtle shadow-card p-5 hover:border-primary-container transition-colors">
              <span className="inline-flex text-primary p-2.5 bg-primary-fixed/40 rounded-lg"><l.icon size={22} /></span>
              <p className="text-body-md font-semibold text-ink mt-3">{l.label}</p>
            </a>
          ))}
        </div>
      </div>
    </PageLayout>
  )
}

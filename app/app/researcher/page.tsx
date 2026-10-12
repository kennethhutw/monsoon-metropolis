'use client'
import { useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUSD, getRiskColor, getRiskBg } from '@/lib/utils'
import { MOCK_RISK_PROFILES } from '@/data/mockRisk'
import { RiskProfile, DimensionScore } from '@/types/risk'
import { Bot } from 'lucide-react'

const COLOR_MAP = { green: 'var(--risk-low)', orange: 'var(--risk-medium)', red: 'var(--risk-high)' }
const RISK_LABEL: Record<'low' | 'medium' | 'high', string> = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }

function ScoreBar({ d }: { d: DimensionScore }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-label-md text-ink-faint w-36 shrink-0">{d.label}</span>
      <div className="flex-1 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${d.score}%`, background: COLOR_MAP[d.color] }} />
      </div>
      <span className="text-label-md font-bold w-6 text-right" style={{ color: COLOR_MAP[d.color] }}>{d.score}</span>
    </div>
  )
}

function DimensionBlock({ title, weight, items }: { title: string; weight: string; items: DimensionScore[] }) {
  const avg = Math.round(items.reduce((s, d) => s + d.score, 0) / items.length)
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-body-md font-bold text-ink">{title}</span>
          <span className="text-label-md text-ink-faint ml-2">Weight {weight}</span>
        </div>
        <span className="text-body-lg font-bold text-primary">{avg}</span>
      </div>
      {items.map(d => <ScoreBar key={d.label} d={d} />)}
    </div>
  )
}

function AIAnalysis({ profile }: { profile: RiskProfile }) {
  const [question, setQuestion] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [queried, setQueried] = useState(false)

  const query = async () => {
    setLoading(true)
    setQueried(true)
    try {
      const res = await fetch('/api/ai/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, question: question.trim() || undefined }),
      })
      const data = await res.json()
      setText(data.analysis)
      setIsFallback(data.isFallback)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-primary/[0.03] rounded-xl border border-border-subtle shadow-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bot size={16} className="text-primary" />
        <span className="text-body-md font-bold text-ink">AI Risk Analysis</span>
        {isFallback && <span className="text-label-md px-1.5 py-0.5 rounded bg-risk-medium/15 text-risk-medium font-mono">Fallback</span>}
      </div>
      <div className="flex gap-2 mb-3">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && query()}
          placeholder="Enter a question (leave blank for default analysis)"
          className="flex-1 h-9 text-body-md border border-border-subtle rounded-lg px-3 bg-surface-container-low focus:outline-none focus:border-primary-container"
        />
        <button
          onClick={query}
          disabled={loading}
          className="h-9 px-4 text-body-md bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40 whitespace-nowrap font-semibold"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : queried ? (
        <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap italic">{text}</p>
      ) : (
        <p className="text-body-md text-ink-faint">Click &quot;Analyze&quot; to get an AI risk assessment</p>
      )}
    </div>
  )
}

export default function ResearcherPage() {
  const profiles = Object.values(MOCK_RISK_PROFILES)
  const [selectedId, setSelectedId] = useState(profiles[0]?.companyId)
  const profile = MOCK_RISK_PROFILES[selectedId]

  return (
    <PageLayout title="Research Tools" subtitle="Market analysis and risk research">
      {/* Company selector */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {profiles.map(p => (
          <button
            key={p.companyId}
            onClick={() => setSelectedId(p.companyId)}
            className={`text-body-md px-4 py-2 rounded-lg border transition-colors ${
              selectedId === p.companyId
                ? 'bg-primary text-white border-primary'
                : 'bg-surface text-on-surface-variant border-border-subtle hover:border-primary-container'
            }`}
          >
            {p.companyName}
          </button>
        ))}
      </div>

      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: 4-dimension scores */}
          <div className="lg:col-span-2 space-y-4">
            <DimensionBlock title="Financial Metrics" weight="30%" items={profile.financial} />
            <DimensionBlock title="On-Chain Data" weight="35%" items={profile.onchain} />
            <DimensionBlock title="Macro Environment" weight="25%" items={profile.macro} />
            <DimensionBlock title="ESG" weight="10%" items={profile.esg} />
          </div>

          {/* Right: overview + AI */}
          <div className="space-y-4">
            <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 text-center">
              <p className="text-body-md text-on-surface-variant mb-2">{profile.companyName}</p>
              <p className="text-display-lg font-bold mb-1" style={{ color: getRiskColor(profile.riskLevel) }}>{profile.totalScore}</p>
              <p className="text-label-md text-ink-faint mb-3">/ 100 Composite Score</p>
              <span className="inline-block text-label-md font-medium px-3 py-1 rounded-full" style={{ color: getRiskColor(profile.riskLevel), background: getRiskBg(profile.riskLevel) }}>
                {RISK_LABEL[profile.riskLevel]}
              </span>
              {profile.recommendedAmount && (
                <div className="mt-4 p-3 bg-primary-fixed/30 rounded-lg">
                  <p className="text-label-md text-ink-faint mb-0.5">Recommended Approval Limit</p>
                  <p className="text-body-md font-bold text-primary font-mono">{formatUSD(profile.recommendedAmount)}</p>
                </div>
              )}
              {profile.isMock && (
                <p className="text-label-md text-ink-faint mt-3 font-mono">🔵 MOCK DATA</p>
              )}
            </div>

            <AIAnalysis key={profile.companyId} profile={profile} />
          </div>
        </div>
      )}
    </PageLayout>
  )
}
